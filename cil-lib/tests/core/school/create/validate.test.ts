import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  MachineError,
  OnboardingError,
  processOnboardingRequest,
} from '../../../../src';
import * as ProcessFns from '../../../../src/lib/core/process';
import { Entity, Response, School } from '../../../../src/lib/protos';
import { Context } from '../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../util';

export type SchoolTestCase = {
  scenario: string;
  school: School;
};

export const VALID_SCHOOLS: SchoolTestCase[] = [
  {
    scenario: 'valid',
    school: setUpSchool(),
  },
];

export const INVALID_SCHOOLS: SchoolTestCase[] = [
  {
    scenario: 'the external uuid is invalid',
    school: (() => {
      const s = setUpSchool();
      s.setExternalUuid('6aec2c48-aa45-464c-b3ee-59cd');
      return s;
    })(),
  },
  {
    scenario: 'the external organization uuid is invalid',
    school: (() => {
      const s = setUpSchool();
      s.setExternalOrganizationUuid('6aec2c48-aa45-464c-b3ee-59cd');
      return s;
    })(),
  },
  {
    scenario: 'the name is less than the minimum character limit',
    school: (() => {
      const s = setUpSchool();
      s.setName('A');
      return s;
    })(),
  },
  {
    scenario: 'the name is greater than the maximum character limit',
    school: (() => {
      const s = setUpSchool();
      s.setName(
        'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890'
      );
      return s;
    })(),
  },
  {
    scenario: 'the shortcode is less than the minimum character limit',
    school: (() => {
      const s = setUpSchool();
      s.setShortCode('A');
      return s;
    })(),
  },
  {
    scenario: 'the name is missing',
    school: (() => {
      const s = setUpSchool(false);
      return s;
    })(),
  },
  {
    scenario: 'the uuid is missing',
    school: (() => {
      const s = setUpSchool(true, false);
      return s;
    })(),
  },
  {
    scenario: 'the organization uuid is missing',
    school: (() => {
      const s = setUpSchool(true, true, false);
      return s;
    })(),
  },
  {
    scenario: 'the shortcode is missing',
    school: (() => {
      const s = setUpSchool(true, true, true, false);
      return s;
    })(),
  },
  {
    scenario: 'the name is an empty string',
    school: (() => {
      const s = setUpSchool();
      s.setName('');
      return s;
    })(),
  },
  {
    scenario: 'the uuid is an empty string',
    school: (() => {
      const s = setUpSchool();
      s.setExternalUuid('');
      return s;
    })(),
  },
  {
    scenario: 'the organization uuid is an empty string',
    school: (() => {
      const s = setUpSchool();
      s.setExternalOrganizationUuid('');
      return s;
    })(),
  },
  {
    scenario: 'the shortcode is an empty string',
    school: (() => {
      const s = setUpSchool();
      s.setShortCode('');
      return s;
    })(),
  },
];

describe('school validation', () => {
  let orgIsValidStub: SinonStub;
  let schoolIsValidStub: SinonStub;
  let _composeFunctions: {
    prepare: SinonStub;
    sendRequest: SinonStub;
    store: SinonStub;
  };
  const ctx = Context.getInstance();

  beforeEach(async () => {
    orgIsValidStub = sinon
      .stub(ctx, 'organizationIdIsValid')
      .resolves(uuidv4());
    schoolIsValidStub = sinon
      .stub(ctx, 'schoolIdIsValid')
      .rejects(new Error('Does not exist'));
    const resp = [new Response().setSuccess(true)];
    _composeFunctions = {
      prepare: sinon
        .stub(ProcessFns, 'DUMMY_PREPARE')
        .callsFake(async (data) => {
          return [{ valid: data, invalid: [] }, LOG_STUB];
        }),
      sendRequest: sinon
        .stub(ProcessFns, 'DUMMY_SEND_REQUEST')
        .callsFake(async (data) => {
          return [{ valid: data, invalid: [] }, LOG_STUB];
        }),
      store: sinon.stub(ProcessFns, 'DUMMY_STORE').resolves(resp),
    };
  });

  afterEach(() => {
    orgIsValidStub.restore();
    schoolIsValidStub.restore();
    sinon.restore();
  });

  VALID_SCHOOLS.forEach(({ scenario, school }) => {
    it(`should pass when a school is ${scenario}`, async () => {
      const req = wrapRequest(school);
      const resp = await processOnboardingRequest(req, LOG_STUB);
      const responses = resp.getResponsesList();
      expect(responses).to.have.length(1);
      expect(responses[0]).not.to.be.undefined;
      expect(responses[0].getSuccess()).to.be.true;
    });
  });

  describe('should fail when ', () => {
    INVALID_SCHOOLS.forEach(({ scenario, school }) => {
      it(scenario, async () => {
        const req = wrapRequest(school);
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
          req.getRequestsList()[0].getSchool()?.getExternalUuid()
        );
        expect(response.entity).to.equal(Entity.SCHOOL);
        expect(response.errors?.validation).not.to.be.undefined;
      });
    });
  });

  it('should fail if the organization ID is not in the database', async () => {
    const req = wrapRequest(VALID_SCHOOLS[0].school);
    orgIsValidStub.rejects(
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
      req.getRequestsList()[0].getSchool()?.getExternalUuid()
    );
    expect(response.entity).to.equal(Entity.SCHOOL);
    expect(response.errors?.validation).not.to.be.undefined;
    expect(response.errors?.validation?.errorsList[0]).not.to.be.undefined;
  });

  it('should fail if the school ID already exists', async () => {
    const req = wrapRequest(VALID_SCHOOLS[0].school);
    schoolIsValidStub.resolves();
    const resp = await processOnboardingRequest(req, LOG_STUB);
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(1);
    const response = responses[0];
    expect(response.success).to.be.false;
    expect(response.requestId).to.equal(
      req.getRequestsList()[0].getRequestId()
    );
    expect(response.entityId).to.equal(
      req.getRequestsList()[0].getSchool()?.getExternalUuid()
    );
    expect(response.entity).to.equal(Entity.SCHOOL);
    expect(response.errors?.entityAlreadyExists).not.to.be.undefined;
  });
});

function setUpSchool(
  name = true,
  uuid = true,
  orgId = true,
  shortcode = true
): School {
  const s = new School();
  if (name) s.setName('Test School');
  if (uuid) s.setExternalUuid(uuidv4());
  if (orgId) s.setExternalOrganizationUuid(uuidv4());
  if (shortcode) s.setShortCode('SCHOOL');
  return s;
}
