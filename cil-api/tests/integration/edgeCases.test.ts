import { proto, grpc, Context } from 'cil-lib';
import { expect } from 'chai';
import { OnboardingServer } from '../../src/lib/api';
import { onboard, populateAdminService } from '../util';
import { TestCaseBuilder } from '../util/testCases';

const { OnboardingClient } = proto;

describe.skip('When receiving requests over the web the server should', () => {
  let server: grpc.Server;
  let client: proto.OnboardingClient;

  before(async () => {
    await Context.getInstance(true);
    server = new grpc.Server();
    server.addService(proto.OnboardingService, new OnboardingServer());

    server.bindAsync(
      'localhost:0',
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        expect(err).to.be.null;
        client = new OnboardingClient(
          `localhost:${port}`,
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
  }).timeout(50000);
});
