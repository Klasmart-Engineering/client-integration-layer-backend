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
import { Organization as OrgRepo } from '../../../../src/lib/database';
import {
  BatchOnboarding,
  Entity,
  Organization,
  Response,
  Responses,
} from '../../../../src/lib/protos';
import { Context } from '../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../util';

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
  let _composeFunctions: {
    prepare: SinonStub;
    sendRequest: SinonStub;
    store: SinonStub;
  };

  before(() => {
    process.env.ADMIN_SERVICE_API_KEY = 'abcdefg';
  });

  beforeEach(async () => {
    contextStub = sinon.stub(ctx, 'organizationIdIsValid');
    orgStub = sinon.stub(OrgRepo, 'initializeOrganization').resolves();
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
    contextStub.restore();
    orgStub.restore();
    sinon.restore();
  });

  VALID_ORGANIZATIONS.forEach(({ scenario, org }) => {
    it(`should pass when an organization is ${scenario}`, async () => {
      const req = wrapRequest(org);
      const resp = await processOnboardingRequest(req, LOG_STUB);
      const responses = resp.getResponsesList();
      expect(responses).to.have.length(1);
      expect(responses[0]).not.to.be.undefined;
      expect(responses[0].getSuccess()).to.be.true;
    });
  });

  describe('should fail when ', () => {
    INVALID_ORGANIZATIONS.forEach(({ scenario, org }) => {
      it(scenario, async () => {
        const req = wrapRequest(org);
        const resp = await makeCommonAssertions(req);
        const response = resp?.toObject()?.responsesList[0];
        expect(response.errors?.validation).not.to.be.undefined;
      });
    });
  });

  it('should fail if the organization ID is not in the database', async () => {
    const req = wrapRequest(VALID_ORGANIZATIONS[0].org);
    orgStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid Organization',
        Category.REQUEST,
        LOG_STUB
      )
    );
    const resp = await makeCommonAssertions(req);
    const response = resp?.toObject()?.responsesList[0];
    expect(response.errors?.validation).not.to.be.undefined;
  });
}).timeout(5000);

function setUpOrganization(name?: string, id?: string): Organization {
  const org = new Organization();
  if (name) org.setName(name);
  if (id) org.setExternalUuid(id);
  return org;
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
      req.getRequestsList()[0].getOrganization()?.getExternalUuid()
    );
    expect(response.entity).to.equal(Entity.ORGANIZATION);
    return resp;
  } catch (error) {
    expect(error, 'this api should not error').to.be.undefined;
  }
  throw new Error('Unexpected reached the end of the test');
}
