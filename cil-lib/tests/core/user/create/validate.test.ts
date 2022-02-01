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
import { Entity, Gender, Response, User } from '../../../../src/lib/protos';
import { Context } from '../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../util';

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
      s.setGivenName('A');
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
      s.setFamilyName('A');
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
    scenario: 'the username is missing',
    user: (() => {
      const s = setUpUser({ ...USER, username: false });
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
    scenario: 'the date of birth is an invalid format',
    user: (() => {
      const s = setUpUser();
      s.setDateOfBirth('18th March 2015');
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
    scenario: 'the short code is empty',
    user: (() => {
      const s = setUpUser();
      s.setShortCode('');
      return s;
    })(),
  },
  {
    scenario: 'the short code is too short',
    user: (() => {
      const s = setUpUser();
      s.setShortCode('AB');
      return s;
    })(),
  },
  {
    scenario: 'the short code is too long',
    user: (() => {
      const s = setUpUser();
      s.setShortCode('ABCdefHIJklmNOPqr');
      return s;
    })(),
  },
  {
    scenario: 'the short code is invalid',
    user: (() => {
      const s = setUpUser();
      s.setShortCode('****');
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

describe('user validation', () => {
  let orgStub: SinonStub;
  let schoolStub: SinonStub;
  let userStub: SinonStub;
  let roleStub: SinonStub;
  let _composeFunctions: {
    prepare: SinonStub;
    sendRequest: SinonStub;
    store: SinonStub;
  };
  const ctx = Context.getInstance();

  beforeEach(() => {
    orgStub = sinon.stub(ctx, 'organizationIdIsValid');
    schoolStub = sinon.stub(ctx, 'getSchoolId').resolves();
    roleStub = sinon
      .stub(ctx, 'rolesAreValid')
      .resolves([{ id: uuidv4(), name: 'Role' }]);
    userStub = sinon.stub(ctx, 'userDoesNotExist');
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
    schoolStub.restore();
    sinon.restore();
  });

  VALID_USERS.forEach(({ scenario, user }) => {
    it(`should pass when a user ${scenario}`, async () => {
      const req = wrapRequest(user);
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
        try {
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
            req.getRequestsList()[0].getUser()?.getExternalUuid()
          );
          expect(response.entity).to.equal(Entity.USER);
          expect(response.errors?.validation).not.to.be.undefined;
        } catch (error) {
          expect(error).to.be.undefined;
        }
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
    try {
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
        req.getRequestsList()[0].getUser()?.getExternalUuid()
      );
      expect(response.entity).to.equal(Entity.USER);
      expect(response.errors?.validation).not.to.be.undefined;
      expect(response.errors?.validation?.errorsList[0]).not.to.be.undefined;
    } catch (error) {
      expect(error).to.be.undefined;
    }
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
    try {
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
        req.getRequestsList()[0].getUser()?.getExternalUuid()
      );
      expect(response.entity).to.equal(Entity.USER);
      expect(response.errors?.entityAlreadyExists).not.to.be.undefined;
    } catch (error) {
      expect(error).to.be.undefined;
    }
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
    try {
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
        req.getRequestsList()[0].getUser()?.getExternalUuid()
      );
      expect(response.entity).to.equal(Entity.USER);
      expect(response.errors?.validation).not.to.be.undefined;
      expect(response.errors?.validation?.errorsList[0]).not.to.be.undefined;
    } catch (error) {
      expect(error).to.be.undefined;
    }
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
    shortCode,
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
  if (dateOfBirth) u.setDateOfBirth('09-01-2017');
  if (shortCode) u.setShortCode('abcdef');
  if (roleIdentifiers) u.addRoleIdentifiers('Role');
  return u;
}
