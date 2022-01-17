import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  Context,
  MachineError,
  OnboardingError,
  Organization as OrgRepo,
  ValidationWrapper,
} from '../../../src';
import { Organization } from '../../../src/lib/protos';
import { LOG_STUB, wrapRequest } from '../util';

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
  let contextStub: SinonStub;
  let orgStub: SinonStub;
  const ctx = Context.getInstance();

  before(() => {
    process.env.ADMIN_SERVICE_JWT = 'abcdefg';
  });

  beforeEach(async () => {
    contextStub = sinon.stub(ctx, 'organizationIdIsValid').resolves(uuidv4());
    orgStub = sinon.stub(OrgRepo, 'initializeOrganization').resolves();
  });

  afterEach(() => {
    contextStub.restore();
    orgStub.restore();
  });

  VALID_ORGANIZATIONS.forEach(({ scenario, org }) => {
    it(`should pass when an organization is ${scenario}`, async () => {
      const req = wrapRequest(org);
      try {
        const resp = await ValidationWrapper.parseRequest(req, LOG_STUB);
        expect(resp).not.to.be.undefined;
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });
  });

  describe('should fail when ', () => {
    INVALID_ORGANIZATIONS.forEach(({ scenario, org }) => {
      it(scenario, async () => {
        const req = wrapRequest(org);
        try {
          const resp = await ValidationWrapper.parseRequest(req, LOG_STUB);
          expect(resp).to.be.undefined;
        } catch (error) {
          expect(error).not.to.be.undefined;
          const isOnboardingError = error instanceof OnboardingError;
          expect(isOnboardingError).to.be.true;
          const e = error as OnboardingError;
          expect(e.details).to.have.length.greaterThanOrEqual(1);
          expect(e.error).to.equal('Validation');
        }
      });
    });
  });

  it('should fail if the organization ID is not in the database', async () => {
    const req = wrapRequest(VALID_ORGANIZATIONS[0].org);
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
      expect(e.error).to.equal('Validation');
    }
  });
}).timeout(5000);

function setUpOrganization(name?: string, id?: string): Organization {
  const org = new Organization();
  if (name) org.setName(name);
  if (id) org.setExternalUuid(id);
  return org;
}
