import { expect } from 'chai';
import sinon from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import { ValidationWrapper } from '../../../src';
import { School } from '../../../src/lib/protos';
import { log } from '../../../src/lib/utils';
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
  before(() => {
    sinon.stub(log, 'child').returns(LOG_STUB);
  });

  VALID_SCHOOLS.forEach(({ scenario, school }) => {
    it(`should pass when a school is ${scenario}`, async () => {
      const req = wrapRequest(school);
      try {
        const resp = await ValidationWrapper.parseRequest(req, log);
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
          const resp = await ValidationWrapper.parseRequest(req, log);
          expect(resp).to.be.undefined;
        } catch (error) {
          expect(error).not.to.be.undefined;
          console.log(error);
          expect(error).to.be.string('test');
        }
      });
    });
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
