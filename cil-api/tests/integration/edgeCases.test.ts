import { expect } from 'chai';
import { onboard, populateAdminService } from '../util';
import { TestCaseBuilder } from '../util/testCases';

describe.skip('When receiving requests over the web the server should', () => {
  it('succeed with a small valid series of deterministic inputs', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(5)
      .addValidUsersToEachSchool(10, 1, 3)
      .finalize();
    const result = await onboard(reqs, global.client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;
  }).timeout(50000);
});
