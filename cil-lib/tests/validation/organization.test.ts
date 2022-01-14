import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';

import { organizationSchema } from '../../src';
import { Organization } from '../../src/lib/protos';

export type OrgTestCase = {
  scenario: string;
  org: Organization;
};

export const VALID_ORGANIZATIONS: OrgTestCase[] = [
  {
    scenario: 'valid',
    org: setUpOrganization(
      'Test Organization',
      '6aec2c48-aa45-464c-b3ee-59cdb9511ec1'
    ),
  },
];

export const INVALID_ORGANIZATIONS: OrgTestCase[] = [
  {
    scenario: 'the external uuid is invalid',
    org: setUpOrganization('Test Organization', '6aec2c48-aa45-464c-b3ee-59cd'),
  },
  {
    scenario: 'the name is less than the minimum character limit',
    org: setUpOrganization('1', uuidv4()),
  },
  {
    scenario: 'the name is greater than the maximum character limit',
    org: setUpOrganization(
      'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890',
      uuidv4()
    ),
  },
  {
    scenario: 'the name is missing',
    org: setUpOrganization(undefined, uuidv4()),
  },
  {
    scenario: 'the external uuid is missing',
    org: setUpOrganization('Test Organization', undefined),
  },
  {
    scenario: 'the name is an empty string',
    org: setUpOrganization('', '6aec2c48-aa45-464c-b3ee-59cd'),
  },
  {
    scenario: 'the uuid is an empty string',
    org: setUpOrganization('Test Organization', ''),
  },
];

describe('organization validation', () => {
  VALID_ORGANIZATIONS.forEach(({ scenario, org }) => {
    it(`should pass when an organization is ${scenario}`, () => {
      const { error } = organizationSchema.validate(org.toObject());
      expect(error).to.be.undefined;
    });
  });

  describe('should fail when ', () => {
    INVALID_ORGANIZATIONS.forEach(({ scenario, org }) => {
      it(scenario, () => {
        const { error } = organizationSchema.validate(org.toObject());
        expect(error).to.not.be.undefined;
        expect(error?.details).to.have.length(1);
      });
    });
  });
});

function setUpOrganization(name?: string, id?: string): Organization {
  const org = new Organization();
  if (name) org.setName(name);
  if (id) org.setExternalUuid(id);
  return org;
}
