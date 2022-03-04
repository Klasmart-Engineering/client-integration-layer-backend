import { expect } from 'chai';
import {
  addUsersToOrgReq,
  addUserToOrgReq,
  createOrg,
  deleteUsersOrgLink,
  onboard,
  setUpUser,
  userReq,
} from './util';
import { v4 as uuidv4 } from 'uuid';

import {
  AddUsersToOrganization,
  BatchOnboarding,
  OnboardingRequest,
  Responses,
} from '../../../cil-lib/src/lib/protos';
import { ExternalUuid } from '../../src';

export type AddUsersToOrganizationTestCase = {
  scenario: string;
  addUsersToOrganization: AddUsersToOrganization[];
};

describe('Adding users to org', () => {
  let orgId1: ExternalUuid;
  let orgId2: ExternalUuid;
  let orgId3: ExternalUuid;

  before(async () => {
    orgId1 = await createOrg();
    orgId2 = await createOrg();
    orgId3 = await createOrg();
  });

  function successfulAssertions(
    response: Responses,
    reqs: OnboardingRequest[]
  ) {
    expect(response.getResponsesList()).to.be.length(reqs.length);
    expect(
      response.getResponsesList().filter((r) => !r.getSuccess())
    ).to.be.length(0);
    expect(
      response.getResponsesList().filter((r) => r.hasErrors())
    ).to.be.length(0);
  }

  it(`should pass when you process 52 different users-requests with the same org`, async () => {
    // Create users for org2
    let userReqs: OnboardingRequest[] = [];
    let userIds = new Set<string>();
    for (let i = 0; i < 52; i++) {
      const user = setUpUser(orgId2, uuidv4());
      userIds.add(user.getExternalUuid());
      userReqs.push(
        userReq(user.getExternalOrganizationUuid(), user.getExternalUuid())
      );
    }

    const setUpResponse = await onboard(
      new BatchOnboarding().setRequestsList(userReqs)
    );
    successfulAssertions(setUpResponse, userReqs);

    // Link these users to org1
    let reqs: OnboardingRequest[] = [];
    for (const userId of userIds) {
      reqs.push(addUserToOrgReq(orgId1, userId));
    }
    const response = await onboard(new BatchOnboarding().setRequestsList(reqs));

    successfulAssertions(response, reqs);
  });

  it(`should pass when you want to link users from different orgs to one unique org`, async () => {
    const users: Array<{
      orgId: ExternalUuid;
      userIds: Set<ExternalUuid>;
    }> = [];

    // Create users for org1 and org2
    const userIds: ExternalUuid[] = [];
    users.push({ orgId: orgId1, userIds: new Set([uuidv4(), uuidv4()]) });
    users.push({
      orgId: orgId2,
      userIds: new Set([uuidv4(), uuidv4(), uuidv4()]),
    });

    let setUpUsersReqs: OnboardingRequest[] = [];
    for (const u of users) {
      for (const userId of u.userIds) {
        setUpUsersReqs.push(userReq(u.orgId, userId));
        userIds.push(userId);
      }
    }

    const setUpResponse = await onboard(
      new BatchOnboarding().setRequestsList(setUpUsersReqs)
    );

    successfulAssertions(setUpResponse, setUpUsersReqs);

    // Link the users of org1 and org2 to org3
    let reqs: OnboardingRequest[] = [];
    users.forEach((u) => reqs.push(addUsersToOrgReq(orgId3, u.userIds)));
    const response = await onboard(new BatchOnboarding().setRequestsList(reqs));

    successfulAssertions(response, setUpUsersReqs);
    expect(
      response.getResponsesList().map((response) => response.getEntityId())
    ).to.be.have.members(userIds);
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
