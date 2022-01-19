import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  Errors,
  MachineError,
  OnboardingError,
  ValidationWrapper,
} from '../../../src';
import { Gender, User } from '../../../src/lib/protos';
import { Context } from '../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../util';

const USER = Object.freeze({
  externalUuid: true,
  email: true,
  phone: true,
  username: true,
  givenName: true,
  familyName: true,
  gender: true,
  dateOfBirth: true,
  shortCode: true
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
];

describe('user validation', () => {
  let orgStub: SinonStub;
  let schoolStub: SinonStub;
  let userStub: SinonStub;
  const ctx = Context.getInstance();

  beforeEach(() => {
    orgStub = sinon.stub(ctx, 'organizationIdIsValid').resolves(uuidv4());
    schoolStub = sinon.stub(ctx, 'schoolIdIsValid').resolves();
    userStub = sinon
      .stub(ctx, 'userIdIsValid')
      .rejects(new Error('Does not exist'));
  });

  afterEach(() => {
    orgStub.restore();
    schoolStub.restore();
    userStub.restore();
  });

  VALID_USERS.forEach(({ scenario, user }) => {
    it(`should pass when a user ${scenario}`, async () => {
      const req = wrapRequest(user);
      try {
        const resp = await ValidationWrapper.parseRequest(req, LOG_STUB);
        expect(resp).not.to.be.undefined;
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });
  });

  describe('should fail when ', () => {
    INVALID_USERS.forEach(({ scenario, user }) => {
      it(scenario, async () => {
        const req = wrapRequest(user);
        try {
          const resp = await ValidationWrapper.parseRequest(req, LOG_STUB);
          expect(resp).to.be.undefined;
        } catch (error) {
          expect(error).not.to.be.undefined;
          const isOnboardingError = error instanceof OnboardingError;
          const errors = isOnboardingError ? new Errors([error]) : error;
          expect(errors instanceof Errors).to.be.true;
          for (const e of (errors as Errors).errors) {
            expect(e.details).to.have.length.greaterThanOrEqual(1);
            expect(e.path).to.have.length.greaterThanOrEqual(1);
            expect(e.error).to.equal(MachineError.VALIDATION);
          }
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
        Category.REQUEST
      )
    );
    try {
      const resp = await ValidationWrapper.parseRequest(req, LOG_STUB);
      expect(resp).not.to.be.undefined;
    } catch (error) {
      const isOnboardingError = error instanceof OnboardingError;
      expect(isOnboardingError).to.be.true;
      const e = error as OnboardingError;
      expect(e.msg).to.equal('Invalid Organization');
      expect(e.error).to.equal(MachineError.VALIDATION);
    }
  });

  it('should fail if the user ID is not in the database', async () => {
    const req = wrapRequest(VALID_USERS[0].user);
    schoolStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid User',
        Category.REQUEST
      )
    );
    try {
      const resp = await ValidationWrapper.parseRequest(req, LOG_STUB);
      expect(resp).not.to.be.undefined;
    } catch (error) {
      const isOnboardingError = error instanceof OnboardingError;
      expect(isOnboardingError).to.be.true;
      const e = error as OnboardingError;
      expect(e.msg).to.equal('Invalid User');
      expect(e.error).to.equal(MachineError.VALIDATION);
    }
  });

  it('should fail if the user ID already exists', async () => {
    const req = wrapRequest(VALID_USERS[0].user);
    userStub.resolves();
    try {
      const resp = await ValidationWrapper.parseRequest(req, LOG_STUB);
      expect(resp).not.to.be.undefined;
    } catch (error) {
      const isOnboardingError = error instanceof OnboardingError;
      expect(isOnboardingError).to.be.true;
      const e = error as OnboardingError;
      expect(e.msg).to.include('already exists');
      expect(e.error).to.equal(MachineError.ENTITY_ALREADY_EXISTS);
    }
  });
});

function setUpUser(user = USER): User {
  const {
    externalUuid,
    email,
    phone,
    username,
    givenName,
    familyName,
    gender,
    dateOfBirth,
    shortCode
  } = user;
  const u = new User();
  if (externalUuid) u.setExternalUuid(uuidv4());
  if (email) u.setEmail('test@test.com');
  if (phone) u.setPhone('+912212345678');
  if (username) u.setUsername('USERNAME');
  if (givenName) u.setGivenName('Name');
  if (familyName) u.setFamilyName('Name');
  if (gender) u.setGender(Gender.MALE);
  if (dateOfBirth) u.setDateOfBirth('09-01-2017');
  if (shortCode) u.setShortCode("abcdef");
  return u;
}
