import { proto } from 'cil-lib';
import { expect } from 'chai';
import { onboard, populateAdminService } from '../util';
import { TestCaseBuilder } from '../util/testCases';
import { grpcTestContext, prismaTestContext } from '../setup';

describe.skip('When receiving requests over the web the server should', () => {
  let client: proto.OnboardingClient;

  const prismaCtx = prismaTestContext();
  const grpcCtx = grpcTestContext();

  before(async () => {
    // init grpc server
    await grpcCtx.before().then((c) => {
      client = c;
    });

    // init Prisma
    await prismaCtx.before();
  });

  after(async () => {
    // Clear all test data in the database
    await prismaCtx.after();
    grpcCtx.after();
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
