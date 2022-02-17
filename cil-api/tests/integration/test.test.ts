import { v4 as uuidv4 } from 'uuid';

import { proto, grpc, Context } from 'cil-lib';
import { expect } from 'chai';
import { OnboardingServer } from '../../src/lib/api';
import { onboard, populateAdminService } from '../util';
import { TestCaseBuilder } from '../util/testCases';

const { OnboardingClient } = proto;

describe('When receiving requests over the web the server should', () => {
  let server: grpc.Server;
  let client: proto.OnboardingClient;

  before(async () => {
    await Context.getInstance(true);
    server = new grpc.Server();
    server.addService(proto.OnboardingService, new OnboardingServer());

    server.bindAsync(
      '0.0.0.0:0',
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        expect(err).to.be.null;
        client = new OnboardingClient(
          `0.0.0.0:${port}`,
          grpc.credentials.createInsecure()
        );
        server.start();
        return Promise.resolve();
      }
    );
  });

  after((done) => {
    if (client) client.close();
    server.tryShutdown(done);
  });

  it('succeed when given a small valid series of random inputs', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchools(2)
      .addValidClasses(10)
      .addValidUsers(10)
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;
  });

  it('succeed with a larger valid series of random inputs', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchools(5)
      .addValidClasses(100)
      .addValidUsers(500)
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;
  }).timeout(20000);

  it('succeed with a small valid series of deterministic inputs', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(5)
      .addValidUsersToEachSchool(10, 1, 3)
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;
  });

  it('succeed with a larger valid series of deterministic inputs', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(10)
      .addValidUsersToEachSchool(100, 10)
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;
  }).timeout(20000);

  it('fail when a school is invalid but succeed on all data that is valid', async () => {
    const res = await populateAdminService();
    const invalidSchoolId = uuidv4();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(2)
      .addValidClassesToEachSchool(5)
      .addSchool(
        { externalUuid: invalidSchoolId, externalOrganizationUuid: uuidv4() },
        false
      )
      .addValidUsersToEachSchool(10, 1)
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
  }).timeout(20000);
}).timeout(50000);
