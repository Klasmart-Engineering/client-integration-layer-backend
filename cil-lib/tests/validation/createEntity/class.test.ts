import { expect } from 'chai';
import sinon from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import { ValidationWrapper } from '../../../src';
import { Class } from '../../../src/lib/protos';
import { log } from '../../../src/lib/utils';
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
  before(() => {
    sinon.stub(log, 'child').returns(LOG_STUB);
  });

  VALID_CLASSES.forEach(({ scenario, c }) => {
    it(`should pass when a class is ${scenario}`, async () => {
      const req = wrapRequest(c);
      try {
        const resp = await ValidationWrapper.parseRequest(req, log);
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
