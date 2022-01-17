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
import { School } from '../../../src/lib/protos';
import { Context } from '../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../util';

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
  const ctx = Context.getInstance();

  beforeEach(async () => {
    orgIsValidStub = sinon
      .stub(ctx, 'organizationIdIsValid')
      .resolves(uuidv4());
    schoolIsValidStub = sinon
      .stub(ctx, 'schoolIdIsValid')
      .rejects(new Error('Does not exist'));
  });

  afterEach(() => {
    orgIsValidStub.restore();
    schoolIsValidStub.restore();
  });

  VALID_SCHOOLS.forEach(({ scenario, school }) => {
    it(`should pass when a school is ${scenario}`, async () => {
      const req = wrapRequest(school);
      try {
        const resp = await ValidationWrapper.parseRequest(req, LOG_STUB);
        expect(resp).not.to.be.undefined;
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });
  });

  describe('should fail when ', () => {
    INVALID_SCHOOLS.forEach(({ scenario, school }) => {
      it(scenario, async () => {
        const req = wrapRequest(school);
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
            expect(e.error).to.equal('Validation');
          }
        }
      });
    });
  });

  it('should fail if the organization ID is not in the database', async () => {
    const req = wrapRequest(VALID_SCHOOLS[0].school);
    orgIsValidStub.rejects(
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
      expect(e.error).to.equal('Validation');
    }
  });

  it('should fail if the school ID already exists', async () => {
    const req = wrapRequest(VALID_SCHOOLS[0].school);
    schoolIsValidStub.resolves();
    try {
      const resp = await ValidationWrapper.parseRequest(req, LOG_STUB);
      expect(resp).not.to.be.undefined;
    } catch (error) {
      const isOnboardingError = error instanceof OnboardingError;
      expect(isOnboardingError).to.be.true;
      const e = error as OnboardingError;
      expect(e.msg).to.include('already exists');
      expect(e.error).to.equal('Entity already exists');
    }
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
