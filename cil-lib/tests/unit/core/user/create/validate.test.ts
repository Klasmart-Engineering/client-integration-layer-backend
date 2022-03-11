import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  AdminService,
  Category,
  MachineError,
  OnboardingError,
  processOnboardingRequest,
} from '../../../../../src';
import { User as UserDB } from '../../../../../src/lib/database';
import {
  BatchOnboarding,
  Entity,
  Gender,
  Responses,
  User,
} from '../../../../../src/lib/protos';
import { Context } from '../../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../../util';

const USER = Object.freeze({
  externalUuid: true,
  externalOrganizationUuid: true,
  email: true,
  phone: true,
  username: true,
  givenName: true,
  familyName: true,
  gender: true,
  dateOfBirth: true,
  shortCode: true,
  roleIdentifiers: true,
});

export type UserTestCase = {
  scenario: string;
  user: User;
};

export const VALID_USERS: UserTestCase[] = [
  {
    scenario: 'is valid',
    user: setUpUser(),
  },
  {
    scenario: 'contains everything but a phone number',
    user: setUpUser({ ...USER, phone: false }),
  },
  {
    scenario: 'contains everything but an email',
    user: setUpUser({ ...USER, email: false }),
  },
  {
    scenario: 'contains everything but username',
    user: setUpUser({ ...USER, username: false }),
  },
  {
    scenario: 'contains everything but dateOfBirth',
    user: setUpUser({ ...USER, dateOfBirth: false }),
  },
  {
    scenario: 'contains everything but short code',
    user: setUpUser({ ...USER, shortCode: false }),
  },
  {
    scenario: 'the given name is a single character',
    user: (() => {
      const user = setUpUser();
      user.setGivenName(uuidv4().substring(0, 1));
      return user;
    })(),
  },
  {
    scenario: 'the family name is a single character',
    user: (() => {
      const user = setUpUser();
      user.setFamilyName(uuidv4().substring(0, 1));
      return user;
    })(),
  },
];

export const INVALID_USERS: UserTestCase[] = [
  {
    scenario: 'the external uuid is invalid',
    user: (() => {
      const s = setUpUser();
      s.setExternalUuid('6aec2c48-aa45-464c-b3ee-59cd');
      return s;
    })(),
  },
  {
    scenario: 'the given name is less than the minimum character limit',
    user: (() => {
      const s = setUpUser();
      s.setGivenName('');
      return s;
    })(),
  },
  {
    scenario: 'the given name is greater than the maximum character limit',
    user: (() => {
      const s = setUpUser();
      s.setGivenName(
        'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890'
      );
      return s;
    })(),
  },
  {
    scenario: 'the family name is less than the minimum character limit',
    user: (() => {
      const s = setUpUser();
      s.setFamilyName('');
      return s;
    })(),
  },
  {
    scenario: 'the family name is greater than the maximum character limit',
    user: (() => {
      const s = setUpUser();
      s.setFamilyName(
        'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890'
      );
      return s;
    })(),
  },
  {
    scenario: 'the given name is missing',
    user: (() => {
      const s = setUpUser({ ...USER, givenName: false });
      return s;
    })(),
  },
  {
    scenario: 'the family name is missing',
    user: (() => {
      const s = setUpUser({ ...USER, familyName: false });
      return s;
    })(),
  },
  {
    scenario: 'the uuid is missing',
    user: (() => {
      const s = setUpUser({ ...USER, externalUuid: false });
      return s;
    })(),
  },
  {
    scenario: 'the date of birth is an invalid human readable format',
    user: (() => {
      const s = setUpUser();
      s.setDateOfBirth('18th March 2015');
      return s;
    })(),
  },
  {
    scenario: 'the date of birth uses invalid separators',
    user: (() => {
      const s = setUpUser();
      s.setDateOfBirth('01/2017');
      return s;
    })(),
  },
  {
    scenario: 'the date of birth is a full date of birth',
    user: (() => {
      const s = setUpUser();
      s.setDateOfBirth('18-01-2017');
      return s;
    })(),
  },
  {
    scenario: 'the date of birth has the day instead of month',
    user: (() => {
      const s = setUpUser();
      s.setDateOfBirth('28-2017');
      return s;
    })(),
  },
  {
    scenario: 'the phone and email are missing',
    user: (() => {
      const s = setUpUser({ ...USER, phone: false, email: false });
      return s;
    })(),
  },
  {
    scenario: 'the external organization uuid is invalid',
    user: (() => {
      const s = setUpUser();
      s.setExternalOrganizationUuid('ABCD');
      return s;
    })(),
  },
  {
    scenario: 'the role identifiers are empty',
    user: (() => {
      const s = setUpUser();
      s.setRoleIdentifiersList([]);
      return s;
    })(),
  },
  {
    scenario: 'the role identifier is empty string',
    user: (() => {
      const s = setUpUser();
      s.addRoleIdentifiers('');
      return s;
    })(),
  },
  {
    scenario: 'the role identifier exceeds the limit',
    user: (() => {
      const s = setUpUser();
      s.addRoleIdentifiers(uuidv4());
      return s;
    })(),
  },
];

describe('create user', () => {
  let orgStub: SinonStub;
  let schoolStub: SinonStub;
  let userStub: SinonStub;
  let roleStub: SinonStub;
  let adminStub: SinonStub;
  let createUsersStub: SinonStub;

  beforeEach(() => {
    createUsersStub = sinon.stub().resolves([
      {
        id: uuidv4(),
        givenName: 'Name',
        familyName: 'Name',
        phone: '+912212345678',
        email: 'test@test.com',
      },
    ]);
    adminStub = sinon.stub(AdminService, 'getInstance').resolves({
      createUsers: createUsersStub,
    } as unknown as AdminService);
    orgStub = sinon.stub().resolves();
    schoolStub = sinon.stub().resolves();
    roleStub = sinon.stub().resolves([{ id: uuidv4(), name: 'Role' }]);
    userStub = sinon.stub().resolves();

    sinon.stub(Context, 'getInstance').resolves({
      organizationIdIsValid: orgStub,
      getSchoolId: schoolStub,
      rolesAreValid: roleStub,
      userDoesNotExist: userStub,
    } as unknown as Context);
    sinon.stub(UserDB, 'insertMany').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  VALID_USERS.forEach(({ scenario, user }) => {
    it(`should pass when a user ${scenario}`, async () => {
      const req = wrapRequest(user);
      createUsersStub.resolves([
        {
          id: uuidv4(),
          givenName: req.getRequestsList()[0].getUser()!.getGivenName(),
          familyName: req.getRequestsList()[0].getUser()!.getFamilyName(),
          phone: req.getRequestsList()[0].getUser()!.getPhone(),
          email: req.getRequestsList()[0].getUser()!.getEmail(),
          username: req.getRequestsList()[0].getUser()!.getUsername(),
        },
      ]);
      const resp = await processOnboardingRequest(req, LOG_STUB);
      const responses = resp.getResponsesList();
      expect(responses).to.have.length(1);
      expect(responses[0]).not.to.be.undefined;
      expect(responses[0].getSuccess()).to.be.true;
    });
  });

  describe('should fail when ', () => {
    INVALID_USERS.forEach(({ scenario, user }) => {
      it(scenario, async () => {
        const req = wrapRequest(user);
        const resp = await makeCommonAssertions(req);
        expect(resp?.toObject().responsesList[0].errors?.validation).not.to.be
          .undefined;
      });
    });
  });

  it('should fail if the organization ID is not in the database', async () => {
    const req = wrapRequest(VALID_USERS[0].user);
    orgStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid Organization',
        Category.REQUEST,
        LOG_STUB
      )
    );
    const resp = await makeCommonAssertions(req);
    const response = resp?.toObject().responsesList[0];
    expect(response.errors?.validation).not.to.be.undefined;
    expect(response.errors?.validation?.errorsList[0]).not.to.be.undefined;
  });

  it('should fail if the user ID already exists', async () => {
    const req = wrapRequest(VALID_USERS[0].user);
    userStub.rejects(
      new OnboardingError(
        MachineError.ENTITY_ALREADY_EXISTS,
        'User already exists',
        Category.REQUEST,
        LOG_STUB
      )
    );
    const resp = await makeCommonAssertions(req);
    const response = resp?.toObject().responsesList[0];
    expect(response.errors?.entityAlreadyExists).not.to.be.undefined;
  });

  it('should fail if role names does not exist', async () => {
    const req = wrapRequest(VALID_USERS[0].user);
    roleStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        `Roles a,b,c are invalid`,
        Category.REQUEST,
        LOG_STUB
      )
    );
    const resp = await makeCommonAssertions(req);
    const response = resp?.toObject().responsesList[0];
    expect(response.errors?.validation).not.to.be.undefined;
    expect(response.errors?.validation?.errorsList[0]).not.to.be.undefined;
  });
});

function setUpUser(user = USER): User {
  const {
    externalUuid,
    externalOrganizationUuid,
    email,
    phone,
    username,
    givenName,
    familyName,
    gender,
    dateOfBirth,
    roleIdentifiers,
  } = user;
  const u = new User();
  if (externalUuid) u.setExternalUuid(uuidv4());
  if (externalOrganizationUuid) u.setExternalOrganizationUuid(uuidv4());
  if (email) u.setEmail('test@test.com');
  if (phone) u.setPhone('+912212345678');
  if (username) u.setUsername('USERNAME');
  if (givenName) u.setGivenName('Name');
  if (familyName) u.setFamilyName('Name');
  if (gender) u.setGender(Gender.MALE);
  if (dateOfBirth) u.setDateOfBirth('01-2017');
  if (roleIdentifiers) u.addRoleIdentifiers('Role');
  return u;
}

async function makeCommonAssertions(req: BatchOnboarding): Promise<Responses> {
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
      req.getRequestsList()[0].getUser()?.getExternalUuid()
    );
    expect(response.entity).to.equal(Entity.USER);
    return resp;
  } catch (error) {
    expect(error, 'this api should not error').to.be.undefined;
  }
  throw new Error('Unexpected reached the end of the test');
}
