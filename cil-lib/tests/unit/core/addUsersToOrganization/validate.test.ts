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
  Entity,
  Responses,
} from '../../../../src/lib/protos';
import { AdminService } from '../../../../src/lib/services';
import { Context, ExternalUuid } from '../../../../src/lib/utils';
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

describe('add users to organization', () => {
  let adminStub: SinonStub;
  let orgStub: SinonStub;
  let userStub: SinonStub;
  let roleStub: SinonStub;
  let orgIdStub: SinonStub;
  let linkStub: SinonStub;
  let contextStub: SinonStub;

  beforeEach(() => {
    const orgId = uuidv4();
    adminStub = sinon.stub(AdminService, 'getInstance').resolves({
      addUsersToOrganizations: sinon
        .stub()
        .resolves([{ id: orgId, name: 'Test org' }]),
    } as unknown as AdminService);
    orgStub = sinon.stub().resolves();
    userStub = sinon.stub().resolves({
      valid: new Map<string, string>([[uuidv4(), uuidv4()]]),
      invalid: [],
    });
    roleStub = sinon.stub().resolves([{ id: uuidv4(), name: 'Test role 1' }]);
    orgIdStub = sinon.stub().resolves(orgId);
    linkStub = sinon
      .stub(Link, 'usersBelongToOrganization')
      .resolves({ valid: [], invalid: [uuidv4()] });
    contextStub = sinon.stub(Context, 'getInstance').resolves({
      getOrganizationId: orgIdStub,
      organizationIdIsValid: orgStub,
      rolesAreValid: roleStub,
      getUserIds: userStub,
    } as unknown as Context);

    sinon.stub(Link, 'linkUserToOrg').resolves(orgId);
  });

  afterEach(() => {
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
      ({
        scenario,
        addUsersToOrganization: addUserToOrg,
        message: expectedErrorMessage,
      }) => {
        it(scenario, async () => {
          const req = wrapRequest(addUserToOrg);
          const resp = await processOnboardingRequest(req, LOG_STUB);
          const userId = addUserToOrg.getExternalUserUuidsList()[0];
          assertValidationErrorUser(resp, userId, expectedErrorMessage);
          const response = resp.toObject().responsesList[0];
          expect(response.errors?.validation).not.to.be.undefined;
        });
      }
    );
  });

  it('should fail if the org ID is not in the database', async () => {
    const addUsersToOrg = setUpAddUsersToOrg();
    const req = wrapRequest(addUsersToOrg);
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
    const resp = await processOnboardingRequest(req, LOG_STUB);
    assertValidationErrorUser(
      resp,
      addUsersToOrg.getExternalUserUuidsList()[0]
    );
  });

  it('should fail if the role names are not found', async () => {
    const addUsersToOrg = setUpAddUsersToOrg();
    const req = wrapRequest(addUsersToOrg);
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
    const resp = await processOnboardingRequest(req, LOG_STUB);
    assertValidationErrorUser(
      resp,
      addUsersToOrg.getExternalUserUuidsList()[0],
      'Invalid'
    );
  });

  it('should fail if retrieving user ids db error', async () => {
    const addUsersToOrg = setUpAddUsersToOrg();
    const req = wrapRequest(addUsersToOrg);
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
    const resp = await processOnboardingRequest(req, LOG_STUB);
    assertValidationErrorUser(
      resp,
      addUsersToOrg.getExternalUserUuidsList()[0],
      'Invalid'
    );
  });

  it('should fail if the user already belongs to the org', async () => {
    const addUsersToOrg = setUpAddUsersToOrg();
    const userId = addUsersToOrg.getExternalUserUuidsList()[0];
    const req = wrapRequest(addUsersToOrg);
    linkStub.resolves({ valid: [userId], invalid: [] });
    const resp = await processOnboardingRequest(req, LOG_STUB);
    assertUserError(resp, userId);
    expect(resp.getResponsesList()[0].toObject().errors!.entityAlreadyExists)
      .not.to.be.undefined;
    expect(
      resp.getResponsesList()[0].toObject().errors!.entityAlreadyExists!
        .detailsList
    ).to.includes.members([
      `User: ${userId} already belongs to Organization: ${addUsersToOrg.getExternalOrganizationUuid()}`,
    ]);
  });

  it('if one user belongs to the org, but others dont, it should fail that user and pass the others', async () => {
    const addUsers = setUpAddUsersToOrg();
    const user1 = uuidv4();
    const user2 = uuidv4();
    const user3 = uuidv4();
    addUsers.setExternalUserUuidsList([user1, user2, user3]);

    const req = wrapRequest(addUsers);
    userStub.onFirstCall().resolves({
      valid: new Map<string, string>([
        [uuidv4(), uuidv4()],
        [uuidv4(), uuidv4()],
        [uuidv4(), uuidv4()],
      ]),
      invalid: [],
    });
    userStub.onSecondCall().resolves({
      valid: new Map<string, string>([
        [uuidv4(), uuidv4()],
        [uuidv4(), uuidv4()],
      ]),
      invalid: [],
    });
    contextStub.resolves({
      getOrganizationId: orgIdStub,
      organizationIdIsValid: orgStub,
      rolesAreValid: roleStub,
      getUserIds: userStub,
    } as unknown as Context);
    linkStub.resolves({ valid: [user2], invalid: [user1, user3] });

    const resp = await processOnboardingRequest(req, LOG_STUB);
    expect(resp).not.to.be.undefined;
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(3);

    // Test valid responses are correct
    const validResponse = responses[1];
    expect(validResponse).not.to.be.undefined;
    expect(validResponse.success).to.be.true;

    // Test invalid response is correct
    const invalidResponse = responses[0];
    expect(invalidResponse.success).to.be.false;
    expect(invalidResponse.requestId).to.eql(
      req.getRequestsList()[0].getRequestId()?.toObject()
    );
    expect(invalidResponse.entityId).to.contains(user2);
    expect(invalidResponse.entity).to.equal(Entity.USER);
    expect(invalidResponse.errors?.entityAlreadyExists).not.to.be.undefined;
    expect(
      invalidResponse.errors?.entityAlreadyExists?.detailsList
    ).to.includes.members([
      `User: ${user2} already belongs to Organization: ${addUsers.getExternalOrganizationUuid()}`,
    ]);
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

function assertValidationErrorUser(
  resp: Responses,
  userId: ExternalUuid,
  expectedMessage?: string
) {
  const response = assertUserError(resp, userId)
    .getResponsesList()[0]
    .toObject();
  expect(response.errors?.validation).not.to.be.undefined;
  if (expectedMessage) {
    expect(
      response.errors?.validation?.errorsList[0].detailsList[0]
    ).to.contains(expectedMessage);
  }
}

function assertUserError(resp: Responses, userId: ExternalUuid) {
  const responses = resp.toObject().responsesList;
  expect(responses).to.have.lengthOf(1);
  const response = responses[0];
  expect(response.success).to.be.false;
  expect(response.requestId).to.eql(response.requestId);
  if (userId && userId.length > 0) {
    expect(response.entityId).to.eql(userId);
  }
  expect(response.entity).to.equal(Entity.USER);
  return resp;
}
