import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  MachineError,
  OnboardingError,
  processOnboardingRequest,
} from '../../../../src';
import { Class as ClassDB } from '../../../../src/lib/database';
import { Class, Entity } from '../../../../src/lib/protos';
import { AdminService } from '../../../../src/lib/services';
import { Context } from '../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../util';

export type ClassTestCase = {
  scenario: string;
  c: Class;
};

export const VALID_CLASSES: ClassTestCase[] = [
  {
    scenario: 'valid',
    c: setUpClass(),
  },
];

export const INVALID_CLASSES: ClassTestCase[] = [
  {
    scenario: 'the external uuid is invalid',
    c: (() => {
      const s = setUpClass();
      s.setExternalUuid('6aec2c48-aa45-464c-b3ee-59cd');
      return s;
    })(),
  },
  {
    scenario: 'the external organization uuid is invalid',
    c: (() => {
      const s = setUpClass();
      s.setExternalOrganizationUuid('6aec2c48-aa45-464c-b3ee-59cd');
      return s;
    })(),
  },
  {
    scenario: 'the external school uuid is invalid',
    c: (() => {
      const s = setUpClass();
      s.setExternalSchoolUuid('6aec2c48-aa45-464c-b3ee-59cd');
      return s;
    })(),
  },
  {
    scenario: 'the name is less than the minimum character limit',
    c: (() => {
      const s = setUpClass();
      s.setName('A');
      return s;
    })(),
  },
  {
    scenario: 'the name is greater than the maximum character limit',
    c: (() => {
      const s = setUpClass();
      s.setName(
        'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890'
      );
      return s;
    })(),
  },
  {
    scenario: 'the name is missing',
    c: (() => {
      const s = setUpClass(false);
      return s;
    })(),
  },
  {
    scenario: 'the uuid is missing',
    c: (() => {
      const s = setUpClass(true, false);
      return s;
    })(),
  },
  {
    scenario: 'the organization uuid is missing',
    c: (() => {
      const s = setUpClass(true, true, false);
      return s;
    })(),
  },
  {
    scenario: 'the school uuid is missing',
    c: (() => {
      const s = setUpClass(true, true, true, false);
      return s;
    })(),
  },
  {
    scenario: 'the name is an empty string',
    c: (() => {
      const s = setUpClass();
      s.setName('');
      return s;
    })(),
  },
  {
    scenario: 'the uuid is an empty string',
    c: (() => {
      const s = setUpClass();
      s.setExternalUuid('');
      return s;
    })(),
  },
  {
    scenario: 'the organization uuid is an empty string',
    c: (() => {
      const s = setUpClass();
      s.setExternalOrganizationUuid('');
      return s;
    })(),
  },
  {
    scenario: 'the school uuid is an empty string',
    c: (() => {
      const s = setUpClass();
      s.setExternalSchoolUuid('');
      return s;
    })(),
  },
];

describe('class validation', () => {
  let orgStub: SinonStub;
  let schoolStub: SinonStub;
  let classStub: SinonStub;
  const ctx = Context.getInstance();

  beforeEach(async () => {
    process.env.ADMIN_SERVICE_API_KEY = uuidv4();
    const admin = await AdminService.getInstance();
    sinon
      .stub(admin, 'createClasses')
      .resolves([{ id: uuidv4(), name: 'Test Class' }]);
    orgStub = sinon.stub(ctx, 'organizationIdIsValid');
    
    schoolStub = sinon.stub(ctx, 'getSchoolId').resolves();
    classStub = sinon
      .stub(ctx, 'getClassId')
      .rejects(new Error('Does not exist'));
    sinon.stub(ctx, 'getOrganizationId').resolves(uuidv4());
    sinon.stub(ClassDB, 'insertOne').resolves();
  });

  afterEach(() => {
    orgStub.restore();
    schoolStub.restore();
    classStub.restore();
    sinon.restore();
  });

  VALID_CLASSES.forEach(({ scenario, c }) => {
    it(`should pass when a class is ${scenario}`, async () => {
      const req = wrapRequest(c);
      const resp = await processOnboardingRequest(req, LOG_STUB);
      const responses = resp.getResponsesList();
      expect(responses).to.have.length(1);
      expect(responses[0]).not.to.be.undefined;
      expect(responses[0].getSuccess()).to.be.true;
    });
  });

  describe('should fail when ', () => {
    INVALID_CLASSES.forEach(({ scenario, c }) => {
      it(scenario, async () => {
        const req = wrapRequest(c);
        const resp = await processOnboardingRequest(req, LOG_STUB);
        expect(resp).not.to.be.undefined;
        const responses = resp.toObject().responsesList;
        expect(responses).to.have.lengthOf(1);
        const response = responses[0];
        expect(response.success).to.be.false;
        expect(response.requestId).to.equal(
          req.getRequestsList()[0].getRequestId()
        );
        expect(response.entityId).to.equal(
          req.getRequestsList()[0].getClass()?.getExternalUuid()
        );
        expect(response.entity).to.equal(Entity.CLASS);
        expect(response.errors?.validation).not.to.be.undefined;
      });
    });
  });

  it('should fail if the organization ID is not in the database', async () => {
    const req = wrapRequest(VALID_CLASSES[0].c);
    orgStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid Organization',
        Category.REQUEST,
        LOG_STUB
      )
    );
    const resp = await processOnboardingRequest(req, LOG_STUB);
    expect(resp).not.to.be.undefined;
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(1);
    const response = responses[0];
    expect(response.success).to.be.false;
    expect(response.requestId).to.equal(
      req.getRequestsList()[0].getRequestId()
    );
    expect(response.entityId).to.equal(
      req.getRequestsList()[0].getClass()?.getExternalUuid()
    );
    expect(response.entity).to.equal(Entity.CLASS);
    expect(response.errors?.validation).not.to.be.undefined;
  });

  it('should fail if the school ID is not in the database', async () => {
    const req = wrapRequest(VALID_CLASSES[0].c);
    schoolStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid School',
        Category.REQUEST,
        LOG_STUB
      )
    );
    const resp = await processOnboardingRequest(req, LOG_STUB);
    expect(resp).not.to.be.undefined;
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(1);
    const response = responses[0];
    expect(response.success).to.be.false;
    expect(response.requestId).to.equal(
      req.getRequestsList()[0].getRequestId()
    );
    expect(response.entityId).to.equal(
      req.getRequestsList()[0].getClass()?.getExternalUuid()
    );
    expect(response.entity).to.equal(Entity.CLASS);
    expect(response.errors?.validation).not.to.be.undefined;
  });

  it('should fail if the class ID already exists', async () => {
    const req = wrapRequest(VALID_CLASSES[0].c);
    classStub.resolves();
    const resp = await processOnboardingRequest(req, LOG_STUB);
    expect(resp).not.to.be.undefined;
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(1);
    const response = responses[0];
    expect(response.success).to.be.false;
    expect(response.requestId).to.equal(
      req.getRequestsList()[0].getRequestId()
    );
    expect(response.entityId).to.equal(
      req.getRequestsList()[0].getClass()?.getExternalUuid()
    );
    expect(response.entity).to.equal(Entity.CLASS);
    expect(response.errors?.entityAlreadyExists).not.to.be.undefined;
  });
});

function setUpClass(
  name = true,
  uuid = true,
  orgId = true,
  schoolId = true
): Class {
  const s = new Class();
  if (name) s.setName('Test Class');
  if (uuid) s.setExternalUuid(uuidv4());
  if (orgId) s.setExternalOrganizationUuid(uuidv4());
  if (schoolId) s.setExternalSchoolUuid(uuidv4());
  return s;
}
