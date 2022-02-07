import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  MachineError,
  OnboardingError,
  processOnboardingRequest,
} from '../../../../src';
import { Link } from '../../../../src/lib/database';
import {
  AddUsersToOrganization,
  BatchOnboarding,
  Entity,
  Responses,
} from '../../../../src/lib/protos';
import { AdminService } from '../../../../src/lib/services';
import { Context } from '../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../util';

export type AddUsersToOrganizationTestCase = {
  scenario: string;
  addUsersToOrganization: AddUsersToOrganization;
  message?: string;
};

export const VALID_ADD_USERS_TO_ORGANIZATION: AddUsersToOrganizationTestCase[] =
  [
    {
      scenario: 'valid',
      addUsersToOrganization: setUpAddUsersToOrg(),
    },
  ];

export const INVALID_ADD_USERS_TO_ORGANIZATION: AddUsersToOrganizationTestCase[] =
  [
    {
      scenario: 'the external organization uuid is invalid',
      addUsersToOrganization: (() => {
        const addUsers = setUpAddUsersToOrg();
        addUsers.setExternalOrganizationUuid('6aec2c48-aa45-464c-b3ee-59cd');
        return addUsers;
      })(),
      message: '"externalOrganizationUuid" must be a valid GUID',
    },
    {
      scenario: 'the role identifiers are empty',
      addUsersToOrganization: (() => {
        const addUsers = setUpAddUsersToOrg();
        addUsers.setRoleIdentifiersList([]);
        return addUsers;
      })(),
      message: '"roleIdentifiersList" must contain at least 1 items',
    },
    {
      scenario: 'the role identifier is less than the minimum character limit',
      addUsersToOrganization: (() => {
        const addUsers = setUpAddUsersToOrg();
        addUsers.setRoleIdentifiersList(['A']);
        return addUsers;
      })(),
      message:
        '"roleIdentifiersList[0]" length must be at least 3 characters long',
    },
    {
      scenario:
        'the role identifier is greater than the maximum character limit',
      addUsersToOrganization: (() => {
        const addUsers = setUpAddUsersToOrg();
        addUsers.setRoleIdentifiersList([
          'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890',
        ]);
        return addUsers;
      })(),
      message:
        '"roleIdentifiersList[0]" length must be less than or equal to 20 characters long',
    },
    {
      scenario: 'the role identifier is missing',
      addUsersToOrganization: (() => {
        const addUsers = setUpAddUsersToOrg(true, true, false);
        return addUsers;
      })(),
      message: '"roleIdentifiersList" must contain at least 1 items',
    },
    {
      scenario: 'the organization uuid is missing',
      addUsersToOrganization: (() => {
        const addUsers = setUpAddUsersToOrg(false, true, true);
        return addUsers;
      })(),
      message: '"externalOrganizationUuid" is not allowed to be empty',
    },
    {
      scenario: 'the external user ids is missing',
      addUsersToOrganization: (() => {
        const addUsers = setUpAddUsersToOrg(true, false, true);
        return addUsers;
      })(),
      message: '"externalUserUuidsList" must contain at least 1 items',
    },
    {
      scenario: 'the role identifier is an empty string',
      addUsersToOrganization: (() => {
        const addUsers = setUpAddUsersToOrg();
        addUsers.setRoleIdentifiersList(['']);
        return addUsers;
      })(),
      message: '"roleIdentifiersList[0]" is not allowed to be empty',
    },
    {
      scenario: 'the external user is an empty string',
      addUsersToOrganization: (() => {
        const addUsers = setUpAddUsersToOrg();
        addUsers.setExternalUserUuidsList(['']);
        return addUsers;
      })(),
      message: '"externalUserUuidsList[0]" is not allowed to be empty',
    },
    {
      scenario: 'the org id is an empty string',
      addUsersToOrganization: (() => {
        const addUsers = setUpAddUsersToOrg();
        addUsers.setExternalOrganizationUuid('');
        return addUsers;
      })(),
      message: '"externalOrganizationUuid" is not allowed to be empty',
    },
  ];

describe('add programs to school validation', () => {
  let adminStub: SinonStub;
  let orgStub: SinonStub;
  let userStub: SinonStub;
  let roleStub: SinonStub;
  const ctx = Context.getInstance();

  beforeEach(async () => {
    process.env.ADMIN_SERVICE_API_KEY = uuidv4();
    const orgId = uuidv4();
    adminStub = sinon.stub(AdminService, 'getInstance').resolves({
      addUsersToOrganizations: sinon
        .stub()
        .resolves([{ id: orgId, name: 'Test org' }]),
    } as unknown as AdminService);
    orgStub = sinon.stub(ctx, 'organizationIdIsValid').resolves();
    userStub = sinon.stub(ctx, 'getUserIds').resolves({
      valid: new Map<string, string>([[uuidv4(), uuidv4()]]),
      invalid: [],
    });
    roleStub = sinon
      .stub(ctx, 'rolesAreValid')
      .resolves([{ id: uuidv4(), name: 'Test role 1' }]);
    sinon.stub(ctx, 'getOrganizationId').resolves(orgId);
    sinon.stub(Link, 'linkUserToOrg').resolves(orgId);
  });

  afterEach(() => {
    orgStub.restore();
    userStub.restore();
    roleStub.restore();
    adminStub.restore();
    sinon.restore();
  });

  VALID_ADD_USERS_TO_ORGANIZATION.forEach(
    ({ scenario, addUsersToOrganization: c }) => {
      it(`should pass when adding users to org is ${scenario}`, async () => {
        const req = wrapRequest(c);
        const resp = await processOnboardingRequest(req, LOG_STUB);
        const responses = resp.getResponsesList();
        expect(responses).to.have.length(1);
        expect(responses[0]).not.to.be.undefined;
        expect(responses[0].getSuccess()).to.be.true;
      });
    }
  );

  describe('should fail when ', () => {
    INVALID_ADD_USERS_TO_ORGANIZATION.forEach(
      ({ scenario, addUsersToOrganization: c, message: m }) => {
        it(scenario, async () => {
          const req = wrapRequest(c);
          const resp = await makeCommonAssertions(req, m);
          const response = resp.toObject().responsesList[0];
          expect(response.errors?.validation).not.to.be.undefined;
        });
      }
    );
  });

  it('should fail if the org ID is not in the database', async () => {
    const req = wrapRequest(
      VALID_ADD_USERS_TO_ORGANIZATION[0].addUsersToOrganization
    );
    orgStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['Invalid Org']
      )
    );
    await makeCommonAssertions(req, 'Invalid');
  });

  it('should fail if the role names are not found', async () => {
    const req = wrapRequest(
      VALID_ADD_USERS_TO_ORGANIZATION[0].addUsersToOrganization
    );
    roleStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.POSTGRES,
        LOG_STUB,
        [],
        {},
        ['Invalid query']
      )
    );
    await makeCommonAssertions(req, 'Invalid');
  });

  it('should fail if retrieving user ids db error', async () => {
    const req = wrapRequest(
      VALID_ADD_USERS_TO_ORGANIZATION[0].addUsersToOrganization
    );
    orgStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.POSTGRES,
        LOG_STUB,
        [],
        {},
        ['Invalid query']
      )
    );
    await makeCommonAssertions(req, 'Invalid');
  });
});

function setUpAddUsersToOrg(
  orgId = true,
  externalUserIds = true,
  roleNames = true
): AddUsersToOrganization {
  const addUsersToOrganization = new AddUsersToOrganization();
  if (orgId) addUsersToOrganization.setExternalOrganizationUuid(uuidv4());
  if (externalUserIds) {
    addUsersToOrganization.setExternalUserUuidsList([uuidv4()]);
  }
  if (roleNames) addUsersToOrganization.setRoleIdentifiersList(['Test role']);
  return addUsersToOrganization;
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
    expect(response.entityId).to.contains(
      req
        .getRequestsList()[0]
        .getLinkEntities()
        ?.getAddUsersToOrganization()
        ?.getExternalUserUuidsList()
    );
    expect(response.entity).to.equal(Entity.USER);
    expect(response.errors?.validation).not.to.be.undefined;
    console.log(response.errors?.validation?.errorsList[0].detailsList[0]);
    if (expectedMessage) {
      expect(
        response.errors?.validation?.errorsList[0].detailsList[0]
      ).to.contains(expectedMessage);
    }
    return resp;
  } catch (error) {
    console.log(error);
    expect(error, 'this api should not error').to.be.undefined;
  }
  throw new Error('Unexpected reached the end of the test');
}
