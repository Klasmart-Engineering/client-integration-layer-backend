import { expect } from 'chai';
import {
  addUsersToOrgReq,
  createOrg,
  deleteUsersOrgLink,
  onboard,
  userReq,
} from './util';
import { v4 as uuidv4 } from 'uuid';

import {
  AddUsersToOrganization,
  BatchOnboarding,
  OnboardingRequest,
} from '../../../cil-lib/src/lib/protos';
import { ExternalUuid } from '../../src';

export type AddUsersToOrganizationTestCase = {
  scenario: string;
  addUsersToOrganization: AddUsersToOrganization[];
};

describe('Adding users to org', () => {
  let orgId1: ExternalUuid;
  let orgId2: ExternalUuid;

  before(async () => {
    orgId1 = await createOrg();
    orgId2 = await createOrg();
  });

  it(`should pass when adding users to org with dupes`, async () => {
    const users = new Map([
      [orgId1, [uuidv4(), uuidv4(), uuidv4()]],
      [orgId2, [uuidv4(), uuidv4()]],
    ]);

    let setUpUsersReqs: OnboardingRequest[] = [];
    users.forEach((value, key) => {
      setUpUsersReqs = setUpUsersReqs.concat(
        value.map((userIds) => userReq(key, userIds))
      );
    });

    const setUpResponse = await onboard(
      new BatchOnboarding().setRequestsList(setUpUsersReqs)
    );

    expect(setUpResponse.getResponsesList()).to.be.length(
      setUpUsersReqs.length
    );
    expect(
      setUpResponse
        .getResponsesList()
        .filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      setUpResponse
        .getResponsesList()
        .filter((response) => response.hasErrors())
    ).to.be.length(0);

    let reqs: OnboardingRequest[] = [];
    users.forEach((value, key) => {
      reqs.push(addUsersToOrgReq(key, new Set(value)));
    });

    const response = await onboard(new BatchOnboarding().setRequestsList(reqs));
    const userIds = Array.from(users.values()).flatMap((users) => users);
    expect(response.getResponsesList()).to.be.length(userIds.length);
    expect(
      response.getResponsesList().filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      response.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(0);
    expect(
      response.getResponsesList().map((response) => response.getEntityId())
    ).to.be.have.members(userIds);

    // Dupe, have to remove the link or else it will be filtered out
    expect(await deleteUsersOrgLink(userIds)).to.be.true;

    const dupe = await onboard(new BatchOnboarding().setRequestsList(reqs));

    expect(dupe.getResponsesList()).to.be.length(userIds.length);
    expect(
      dupe.getResponsesList().filter((response) => response.getSuccess())
    ).to.be.length(0);
    expect(
      dupe.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(userIds.length);
    expect(
      dupe
        .getResponsesList()
        .filter((response) => response.hasErrors())
        .map((response) => response.getErrors()!)
        .filter((error) => error.getEntityAlreadyExists())
    ).to.be.length(userIds.length);

    // Dupe and single new user id for org1
    const newUserId = uuidv4();

    // Create the new user
    const mixSetUp = await onboard(
      new BatchOnboarding().setRequestsList([userReq(orgId1, newUserId)])
    );

    expect(mixSetUp.getResponsesList()).to.be.length(1);
    expect(
      mixSetUp.getResponsesList().filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      mixSetUp.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(0);

    // Add the new user to org1
    const mixReq = [];
    for (let i = 0; i < reqs.length; i++) {
      const userIds = new Set(
        reqs[i]
          .getLinkEntities()!
          .getAddUsersToOrganization()!
          .getExternalUserUuidsList()
      );

      if (i == 0) {
        userIds.add(newUserId);
        mixReq.push(addUsersToOrgReq(orgId1, userIds));
        continue;
      }
      mixReq.push(addUsersToOrgReq(orgId2, userIds));
    }

    const mixResponse = await onboard(
      new BatchOnboarding().setRequestsList(mixReq)
    );

    expect(mixResponse.getResponsesList()).to.be.length(userIds.length + 1);
    expect(
      mixResponse.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(userIds.length);
    expect(
      mixResponse
        .getResponsesList()
        .filter((response) => response.hasErrors())
        .map((response) => response.getErrors()!)
        .filter((error) => error.getEntityAlreadyExists())
    ).to.be.length(userIds.length);
    expect(
      mixResponse.getResponsesList().filter((response) => response.getSuccess())
    ).to.be.length(1);
    expect(
      mixResponse
        .getResponsesList()
        .filter((response) => response.getSuccess())
        .map((response) => response.getEntityId())
    ).to.be.have.members([newUserId]);
  });
});
