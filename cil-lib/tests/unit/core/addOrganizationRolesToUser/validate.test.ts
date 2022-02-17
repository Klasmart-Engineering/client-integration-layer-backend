import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  MachineError,
  OnboardingError,
  processOnboardingRequest,
} from '../../../../src';
import { Link as LinkDB } from '../../../../src/lib/database';
import {
  AddOrganizationRolesToUser,
  BatchOnboarding,
  Entity,
  Responses,
} from '../../../../src/lib/protos';
import { AdminService } from '../../../../src/lib/services';
import { Context } from '../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../util';

export type AddOrganizationRolesToUserTestCase = {
  scenario: string;
  req: AddOrganizationRolesToUser;
  message?: string;
};

export const VALID: AddOrganizationRolesToUserTestCase[] = [
  {
    scenario: 'valid',
    req: setUpRequest(),
  },
];

export const INVALID: AddOrganizationRolesToUserTestCase[] = [
  {
    scenario: 'the external organization uuid is invalid',
    req: (() => {
      const r = setUpRequest();
      r.setExternalOrganizationUuid('6aec2c48-aa45-464c-b3ee-59cd');
      return r;
    })(),
    message: '"externalOrganizationUuid" must be a valid GUID',
  },
  {
    scenario: 'the role identifiers are empty',
    req: (() => {
      const r = setUpRequest();
      r.setRoleIdentifiersList([]);
      return r;
    })(),
    message: '"roleIdentifiersList" must contain at least 1 items',
  },
  {
    scenario: 'the role identifiers is less than the minimum character limit',
    req: (() => {
      const r = setUpRequest();
      r.setRoleIdentifiersList(['A']);
      return r;
    })(),
    message:
      '"roleIdentifiersList[0]" length must be at least 3 characters long',
  },
  {
    scenario: 'the role identifier is greater than the maximum character limit',
    req: (() => {
      const r = setUpRequest();
      r.setRoleIdentifiersList([
        'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890',
      ]);
      return r;
    })(),
    message:
      '"roleIdentifiersList[0]" length must be less than or equal to 20 characters long',
  },
  {
    scenario: 'the role identifiers are missing',
    req: (() => {
      const r = setUpRequest(true, true, false);
      return r;
    })(),
    message: '"roleIdentifiersList" must contain at least 1 items',
  },
  {
    scenario: 'the user uuid is empty',
    req: (() => {
      const r = setUpRequest(false, true, true);
      return r;
    })(),
    message: '"externalUserUuid" is not allowed to be empty',
  },
  {
    scenario: 'the organization uuid is empty',
    req: (() => {
      const r = setUpRequest(true, false, true);
      return r;
    })(),
    message: '"externalOrganizationUuid" is not allowed to be empty',
  },
  {
    scenario: 'the role identifier is an empty string',
    req: (() => {
      const r = setUpRequest();
      r.setRoleIdentifiersList(['']);
      return r;
    })(),
    message: '"roleIdentifiersList[0]" is not allowed to be empty',
  },
];

describe('add organization roles to user', () => {
  let adminStub: SinonStub;
  let orgIdStub: SinonStub;
  let userIdStub: SinonStub;
  let roleIdsStub: SinonStub;
  let linkDbStub: SinonStub;

  beforeEach(() => {
    process.env.ADMIN_SERVICE_API_KEY = uuidv4();
    const userId = uuidv4();
    adminStub = sinon.stub(AdminService, 'getInstance').resolves({
      addOrganizationRolesToUser: sinon.stub().resolves([{ id: userId }]),
    } as unknown as AdminService);
    orgIdStub = sinon.stub().resolves(uuidv4());
    userIdStub = sinon.stub().resolves(userId);
    roleIdsStub = sinon.stub().resolves([{ id: uuidv4(), name: 'Test role' }]);
    sinon.stub(Context, 'getInstance').resolves({
      getOrganizationId: orgIdStub,
      getUserId: userIdStub,
      rolesAreValid: roleIdsStub,
    } as unknown as Context);
    linkDbStub = sinon.stub(LinkDB, 'userBelongsToOrganization').resolves();
  });

  afterEach(() => {
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

  it('should fail if the organization ID is not in the database', async () => {
    const req = wrapRequest(VALID[0].req);
    orgIdStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['Invalid Org Id']
      )
    );
    await makeCommonAssertions(req, 'Invalid Org Id');
  });

  it('should fail if the user ID is not in the database', async () => {
    const req = wrapRequest(VALID[0].req);
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

  it('should fail if the role IDs are not in the database', async () => {
    const req = wrapRequest(VALID[0].req);
    roleIdsStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['Invalid Role Ids']
      )
    );
    await makeCommonAssertions(req, 'Invalid Role Ids');
  });

  it('should fail if the user does not belong to the parent organization', async () => {
    const req = wrapRequest(VALID[0].req);
    linkDbStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['User does not belong']
      )
    );
    await makeCommonAssertions(req, 'User does not belong');
  });
});

function setUpRequest(
  userId = true,
  orgId = true,
  roleIds = true
): AddOrganizationRolesToUser {
  const op = new AddOrganizationRolesToUser();
  if (userId) op.setExternalUserUuid(uuidv4());
  if (orgId) op.setExternalOrganizationUuid(uuidv4());
  if (roleIds) op.setRoleIdentifiersList(['Test role']);
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
        ?.getAddOrganizationRolesToUser()
        ?.getExternalUserUuid()
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
