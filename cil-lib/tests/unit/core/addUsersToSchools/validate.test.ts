import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  MachineError,
  OnboardingError,
  processOnboardingRequest,
} from '../../../../src';
import { Link as LinkDB, User as UserDB } from '../../../../src/lib/database';
import {
  AddUsersToSchool,
  BatchOnboarding,
  Entity,
  Responses,
} from '../../../../src/lib/protos';
import { AdminService } from '../../../../src/lib/services';
import { Context } from '../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../util';

export type AddUsersToSchoolsTestCase = {
  scenario: string;
  req: AddUsersToSchool;
  message?: string;
};

export const VALID: AddUsersToSchoolsTestCase[] = [
  {
    scenario: 'valid',
    req: setUpRequest(),
  },
];

export const INVALID: AddUsersToSchoolsTestCase[] = [
  {
    scenario: 'the external school uuid is invalid',
    req: (() => {
      const r = setUpRequest();
      r.setExternalSchoolUuid('6aec2c48-aa45-464c-b3ee-59cd');
      return r;
    })(),
    message: '"externalSchoolUuid" must be a valid GUID',
  },
  {
    scenario: 'the user uuid is not a valid uuid',
    req: (() => {
      const r = setUpRequest();
      r.setExternalUserUuidsList(['A']);
      return r;
    })(),
    message: '"externalUserUuidsList[0]" must be a valid GUID',
  },
  {
    scenario: 'the school uuid is empty',
    req: (() => {
      const r = setUpRequest(true, false);
      return r;
    })(),
    message: '"externalSchoolUuid" is not allowed to be empty',
  },
];

describe('add users to school ', () => {
  let adminStub: SinonStub;
  let schoolIdStub: SinonStub;
  let userIdStub: SinonStub;
  let linkDbStub: SinonStub;
  let userDbStub: SinonStub;
  let linkStub: SinonStub;

  beforeEach(() => {
    const userId = uuidv4();
    const schoolId = uuidv4();
    const validMap = new Map();
    validMap.set(userId, userId);
    adminStub = sinon.stub(AdminService, 'getInstance').resolves({
      addUsersToSchools: sinon.stub().resolves([{ id: schoolId }]),
    } as unknown as AdminService);
    linkStub = sinon
      .stub(LinkDB, 'usersBelongToSchool')
      .resolves({ valid: [], invalid: [userId] });

    schoolIdStub = sinon.stub().resolves(schoolId);
    userIdStub = sinon.stub().resolves({
      valid: validMap,
      invalid: [],
    });

    sinon.stub(Context, 'getInstance').resolves({
      getSchoolId: schoolIdStub,
      getUserIds: userIdStub,
    } as unknown as Context);

    linkDbStub = sinon.stub(LinkDB, 'shareTheSameOrganization').resolves();
    userDbStub = sinon.stub(UserDB, 'addUserToSchool').resolves();
  });

  afterEach(() => {
    adminStub.restore();
    linkStub.restore();
    userDbStub.restore();
    sinon.restore();
  });

  VALID.forEach(({ scenario, req: c }) => {
    it(`should pass when ${scenario}`, async () => {
      const req = wrapRequest(c);
      const resp = await processOnboardingRequest(req, LOG_STUB);
      const responses = resp.getResponsesList();
      expect(responses).to.have.length(1);
      expect(responses[0]).not.to.be.undefined;
      expect(responses[0].getSuccess()).to.be.true;
    });
  });

  describe('should fail when ', () => {
    INVALID.forEach(({ scenario, req: c, message: m }) => {
      it(scenario, async () => {
        const req = wrapRequest(c);
        const resp = await makeCommonAssertions(req, m);
        const response = resp.toObject().responsesList[0];
        expect(response.errors?.validation).not.to.be.undefined;
      });
    });
  });

  it('should fail if the users are empty', async () => {
    const req = wrapRequest(setUpRequest(false, true));

    const resp = await processOnboardingRequest(req, LOG_STUB);
    expect(resp).not.to.be.undefined;
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(1);
    const response = responses[0];
    expect(response.success).to.be.false;
    expect(response.requestId).to.eql(
      req.getRequestsList()[0].getRequestId()?.toObject()
    );
    expect(response.entityId).to.equal(
      req
        .getRequestsList()[0]
        .getLinkEntities()
        ?.getAddUsersToSchool()
        ?.getExternalSchoolUuid()
    );
    expect(response.entity).to.equal(Entity.SCHOOL);
    expect(response.errors?.validation).not.to.be.undefined;
  });

  it('should fail if the school ID is not in the database', async () => {
    const req = wrapRequest(setUpRequest());
    schoolIdStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['Invalid School Id']
      )
    );
    await makeCommonAssertions(req, 'Invalid School Id');
  });

  it('should fail if the user ID is not in the database', async () => {
    const req = wrapRequest(setUpRequest());
    userIdStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['Invalid User Id']
      )
    );
    await makeCommonAssertions(req, 'Invalid User Id');
  });

  it(`should fail if the users and school don't share the same organization`, async () => {
    const req = wrapRequest(setUpRequest());
    linkDbStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['Invalid Link']
      )
    );
    await makeCommonAssertions(req, 'Invalid Link');
  });

  it('should fail if the user fails to write to the database', async () => {
    const req = wrapRequest(setUpRequest());
    userDbStub.rejects(
      new OnboardingError(
        MachineError.WRITE,
        'Invalid',
        Category.POSTGRES,
        LOG_STUB,
        [],
        {},
        ['Failed Write']
      )
    );
    const resp = await processOnboardingRequest(req, LOG_STUB);
    expect(resp).not.to.be.undefined;
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(1);
    const response = responses[0];
    expect(response.success).to.be.false;
    expect(response.requestId).to.eql(
      req.getRequestsList()[0].getRequestId()?.toObject()
    );
    expect(response.entityId).to.equal(
      req
        .getRequestsList()[0]
        .getLinkEntities()
        ?.getAddUsersToSchool()
        ?.getExternalUserUuidsList()[0]
    );
    expect(response.entity).to.equal(Entity.USER);
    expect(response.errors?.internalServer).not.to.be.undefined;
    return resp;
  });
});

function setUpRequest(userIds = true, schoolId = true): AddUsersToSchool {
  const op = new AddUsersToSchool();
  if (userIds) op.setExternalUserUuidsList([uuidv4()]);
  if (schoolId) op.setExternalSchoolUuid(uuidv4());
  return op;
}

async function makeCommonAssertions(
  req: BatchOnboarding,
  expectedMessage?: string
): Promise<Responses> {
  try {
    const resp = await processOnboardingRequest(req, LOG_STUB);
    expect(resp).not.to.be.undefined;
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(1);
    const response = responses[0];
    expect(response.success).to.be.false;
    expect(response.requestId).to.eql(
      req.getRequestsList()[0].getRequestId()?.toObject()
    );
    expect(response.entityId).to.equal(
      req
        .getRequestsList()[0]
        .getLinkEntities()
        ?.getAddUsersToSchool()
        ?.getExternalUserUuidsList()[0]
    );
    expect(response.entity).to.equal(Entity.USER);
    expect(response.errors?.validation).not.to.be.undefined;
    if (expectedMessage) {
      expect(response.errors?.validation?.errorsList[0].detailsList).to.include(
        expectedMessage
      );
    }
    return resp;
  } catch (error) {
    expect(error, 'this api should not error').to.be.undefined;
  }
  throw new Error('Unexpected reached the end of the test');
}
