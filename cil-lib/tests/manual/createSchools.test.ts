import { expect } from 'chai';
import {
  createOrg,
  deleteSchools,
  onboard,
  schoolReq,
  setUpSchool,
} from './util';

import { BatchOnboarding, School } from '../../src/lib/protos';
import { Context, ExternalUuid } from '../../src';

export type AddSchoolsTestCase = {
  scenario: string;
  addSchools: School[];
};

describe('creating schools', () => {
  let orgId: ExternalUuid;

  before(async () => {
    orgId = await createOrg();
  });

  it(`should pass when creating schools with dupes`, async () => {
    const school1 = setUpSchool(orgId);
    const school2 = setUpSchool(orgId);

    const response = await onboard(
      new BatchOnboarding().setRequestsList([
        schoolReq(school1),
        schoolReq(school2),
      ])
    );

    expect(response.getResponsesList()).to.be.length(2);
    expect(
      response.getResponsesList().filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      response.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(0);
    expect(
      response.getResponsesList().map((response) => response.getEntityId())
    ).to.be.have.members([
      school1.getExternalUuid(),
      school2.getExternalUuid(),
    ]);

    // Dupe
    expect(
      await clearSchools([school1.getExternalUuid(), school2.getExternalUuid()])
    ).to.be.true;
    const dupeResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        schoolReq(school1),
        schoolReq(school2),
      ])
    );

    expect(dupeResponse.getResponsesList()).to.be.length(2);
    expect(
      dupeResponse
        .getResponsesList()
        .filter((response) => response.getSuccess())
    ).to.be.length(0);
    expect(
      dupeResponse.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(2);
    expect(
      dupeResponse
        .getResponsesList()
        .map((response) => response.getErrors()!)
        .filter((error) => error.getEntityAlreadyExists())
    ).to.be.length(2);
    expect(
      dupeResponse.getResponsesList().map((response) => response.getEntityId())
    ).to.be.have.members([
      school1.getExternalUuid(),
      school2.getExternalUuid(),
    ]);

    // Dupe with new school
    await clearSchools([school1.getExternalUuid(), school2.getExternalUuid()]);
    const newSchool = setUpSchool(orgId);

    const mixResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        schoolReq(school1),
        schoolReq(school2),
        schoolReq(newSchool),
      ])
    );

    expect(mixResponse.getResponsesList()).to.be.length(3);
    expect(
      mixResponse.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(2);
    expect(
      mixResponse
        .getResponsesList()
        .filter((response) => response.hasErrors()!)
        .map((response) => response.getErrors()!)
        .filter((error) => error.getEntityAlreadyExists())
    ).to.be.length(2);
    expect(
      mixResponse.getResponsesList().filter((response) => response.getSuccess())
    ).to.be.length(1);
    expect(
      mixResponse.getResponsesList().map((response) => response.getEntityId())
    ).to.be.have.members([
      school1.getExternalUuid(),
      school2.getExternalUuid(),
      newSchool.getExternalUuid(),
    ]);
  });

  async function clearSchools(schoolIds: ExternalUuid[]) {
    const ctx = await Context.getInstance();
    ctx.reset();
    return await deleteSchools(schoolIds);
  }
});
