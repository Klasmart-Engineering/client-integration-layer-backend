import { expect } from 'chai';
import {
  addUsersToOrgReq,
  addUsersToSchoolReq,
  createOrg,
  onboard,
  schoolReq,
  setUpSchool,
  userReq,
} from './util';
import { v4 as uuidv4 } from 'uuid';

import {
  AddUsersToSchool,
  BatchOnboarding,
  OnboardingRequest,
} from '../../src/lib/protos';
import { ExternalUuid } from '../../src';

export type AddUsersToSchoolTestCase = {
  scenario: string;
  addUsersToSchools: AddUsersToSchool[];
};

function setUpAddUsersToSchool(externalUserIds = [uuidv4()]): AddUsersToSchool {
  const addUsers = new AddUsersToSchool();
  addUsers.setExternalSchoolUuid(uuidv4());
  addUsers.setExternalUserUuidsList(externalUserIds);
  return addUsers;
}

describe('Adding users to school', () => {
  let orgId: ExternalUuid;

  before(async () => {
    orgId = await createOrg();
  });

  it(`should pass when adding users with dupes`, async () => {
    const setUpRequests: OnboardingRequest[] = [];

    const addUsersToSchools = [
      setUpAddUsersToSchool([uuidv4(), uuidv4()]),
      setUpAddUsersToSchool([uuidv4()]),
    ];

    // Set up schools
    new Set(
      addUsersToSchools.map((addUsers) => addUsers.getExternalSchoolUuid())
    ).forEach((school) => {
      setUpRequests.push(schoolReq(setUpSchool(orgId, school)));
    });

    const users = new Set(
      addUsersToSchools.flatMap((addUsers) =>
        addUsers.getExternalUserUuidsList()
      )
    );

    // Create users
    users.forEach((user) => {
      setUpRequests.push(userReq(orgId, user));
    });

    // Add users to org
    setUpRequests.push(addUsersToOrgReq(orgId, users));

    // Add users to school
    const addUsersToSchoolsRequest = addUsersToSchools.map((addUsers) => {
      return addUsersToSchoolReq(addUsers);
    });

    const response = await onboard(
      new BatchOnboarding().setRequestsList(
        setUpRequests.concat(addUsersToSchoolsRequest)
      )
    );

    // Everything is successful
    expect(
      response.getResponsesList().filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      response.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(0);

    // Sending same add users to school again (dupe)
    const responseDupe = await onboard(
      new BatchOnboarding().setRequestsList(addUsersToSchoolsRequest)
    );

    // Expect all to fail with entity already exists and request ids
    expect(
      responseDupe
        .getResponsesList()
        .filter((response) => !response.getSuccess())
    ).to.be.length(users.size);
    expect(
      responseDupe.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(users.size);

    expect(
      responseDupe
        .getResponsesList()
        .map((response) => response.getErrors()!)
        .filter((error) => error.getEntityAlreadyExists())
    ).to.be.length(users.size);

    expect(
      responseDupe.getResponsesList().map((response) => response.getEntityId())
    ).to.include.members(Array.from(users));

    // Request with dupes and with user not added to school
    const newUserId = uuidv4();

    const mixSetUp = await onboard(
      new BatchOnboarding().setRequestsList([
        userReq(orgId, newUserId),
        addUsersToOrgReq(orgId, new Set<string>().add(newUserId)),
      ])
    );

    // set up is successful
    expect(
      mixSetUp.getResponsesList().filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      mixSetUp.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(0);

    // Use first already processed add users to school and add our new user.
    const dupeAndNewAddUsersToSchool = addUsersToSchoolsRequest[0]
      .getLinkEntities()!
      .getAddUsersToSchool()!;
    dupeAndNewAddUsersToSchool!.setExternalUserUuidsList(
      dupeAndNewAddUsersToSchool!.getExternalUserUuidsList().concat(newUserId)
    );

    const mixedResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        addUsersToSchoolReq(dupeAndNewAddUsersToSchool),
      ])
    );

    const expectUsersLength =
      dupeAndNewAddUsersToSchool.getExternalUserUuidsList().length;
    expect(mixedResponse.getResponsesList()).to.be.length(expectUsersLength);
    expect(
      mixedResponse
        .getResponsesList()
        .filter((response) => response.getSuccess())
    ).to.be.length(1);
    expect(
      mixedResponse
        .getResponsesList()
        .filter((response) => response.hasErrors())
    ).to.be.length(expectUsersLength - 1);
    expect(
      mixedResponse.getResponsesList().map((response) => response.getEntityId())
    ).to.have.members(dupeAndNewAddUsersToSchool.getExternalUserUuidsList());
    expect(
      mixedResponse
        .getResponsesList()
        .filter((response) => response.hasErrors())
        .map((error) => error.getErrors()!)
        .filter((error) => error.getEntityAlreadyExists())
    ).to.be.length(expectUsersLength - 1);
  });
});
