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
import { Class } from '../../../src/lib/protos';
import { Context } from '../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../util';

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
    orgStub = sinon.stub(ctx, 'organizationIdIsValid').resolves(uuidv4());
    schoolStub = sinon.stub(ctx, 'schoolIdIsValid').resolves();
    classStub = sinon
      .stub(ctx, 'classIdIsValid')
      .rejects(new Error('Does not exist'));
  });

  afterEach(() => {
    orgStub.restore();
    schoolStub.restore();
    classStub.restore();
  });

  VALID_CLASSES.forEach(({ scenario, c }) => {
    it(`should pass when a class is ${scenario}`, async () => {
      const req = wrapRequest(c);
      try {
        const resp = await ValidationWrapper.parseRequest(req, LOG_STUB);
        expect(resp).not.to.be.undefined;
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });
  });

  describe('should fail when ', () => {
    INVALID_CLASSES.forEach(({ scenario, c }) => {
      it(scenario, async () => {
        const req = wrapRequest(c);
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
    const req = wrapRequest(VALID_CLASSES[0].c);
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

  it('should fail if the school ID is not in the database', async () => {
    const req = wrapRequest(VALID_CLASSES[0].c);
    schoolStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid School',
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
      expect(e.msg).to.equal('Invalid School');
      expect(e.error).to.equal(MachineError.VALIDATION);
    }
  });

  it('should fail if the school ID already exists', async () => {
    const req = wrapRequest(VALID_CLASSES[0].c);
    classStub.resolves();
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
