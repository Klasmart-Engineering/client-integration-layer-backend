import { v4 as uuidv4 } from 'uuid';

import { proto } from 'cil-lib';
import { expect } from 'chai';
import { onboard, populateAdminService, random, wrapRequest } from '../util';
import { TestCaseBuilder } from '../util/testCases';

import { getUser, setUpUser } from '../util/user';
import { IdNameMapper } from 'cil-lib/dist/main/lib/services/adminService';
import { requestAndResponseIdsMatch } from '../util/parseRequest';

describe('When receiving requests over the web the server should', () => {
  it('filter out user if email is invalid', async () => {
    const res = await populateAdminService();
    const org = res.keys().next().value;

    const user1 = setUpUser(org.id, uuidv4());
    user1.setEmail(random());
    const user2 = setUpUser(org.id, uuidv4());
    const reqs = new TestCaseBuilder().addValidOrgs(res).finalize();

    const result = await onboard(reqs, global.client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;

    expect(requestAndResponseIdsMatch(reqs, result)).to.be.true;

    const anotherReq = wrapRequest([
      new proto.OnboardingRequest().setUser(user1),
      new proto.OnboardingRequest().setUser(user2),
    ]);
    const results = await onboard(anotherReq, global.client);

    const respList = await results.toObject().responsesList;

    expect(requestAndResponseIdsMatch(anotherReq, results)).to.be.true;

    expect(respList.filter((result) => result.success === true)).to.be.length(
      1
    );
    expect(respList.filter((result) => result.errors)).to.be.length(1);
    expect(
      respList
        .filter((result) => result.errors)
        .map((result) => result.errors)
        .filter((error) => error.validation)
    ).to.be.length(1);

    const adminUser1 = await getUser(user1.getExternalUuid());
    expect(adminUser1).to.be.undefined;
    const adminUser2 = await getUser(user2.getExternalUuid());
    expect(adminUser2.phone).to.be.eq(user2.getPhone());
    expect(adminUser2.email).to.be.eq(user2.getEmail());
    expect(adminUser2.username).to.be.eq(user2.getUsername());
  }).timeout(50000);

  it('fail the user onboarding if email exceeds max value', async () => {
    const res = await populateAdminService();
    const characters = 'abcdefghijklmnopgrstuvwxyz';
    let invalidEmail = '';
    for (let i = 0; i <= 270; i++) {
      invalidEmail += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(5)
      .addCustomizableUser({ email: invalidEmail })
      .finalize();
    const result = await onboard(reqs, global.client);

    expect(requestAndResponseIdsMatch(reqs, result)).to.be.true;

    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
    // User email must not be greater than 250 characters.
  }).timeout(50000);

  // fails
  it('successfully onboard the user if username exceeds max value', async () => {
    const res = await populateAdminService();
    const characters = 'abcdefghijklmnopgrstuvwxyz';
    const externalUuid = uuidv4();

    let invalidUsername = '';
    for (let i = 0; i <= 40; i++) {
      invalidUsername += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(5)
      .addCustomizableUser({
        username: invalidUsername,
        externalUuid: externalUuid,
      })
      .finalize();
    const result = await onboard(reqs, global.client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;

    expect(requestAndResponseIdsMatch(reqs, result)).to.be.true;

    const returnedUser = await getUser(externalUuid);
    expect(returnedUser).to.be.not.undefined;
    expect(returnedUser).to.have.property('username');
    expect(returnedUser.username).to.be.equal(invalidUsername);
  }).timeout(50000);

  it('fail the user onboarding if phone format is wrong', async () => {
    const res = await populateAdminService();

    // Generate a random invalid phone number
    let invalidPhone = (Math.random() * 1e16).toString(16);

    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(5)
      .addCustomizableUser({ phone: invalidPhone })
      .finalize();
    const result = await onboard(reqs, global.client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);

    expect(requestAndResponseIdsMatch(reqs, result)).to.be.true;
    expect(allSuccess).to.be.false;
    // Invalid phone number
  }).timeout(50000);

  it('onboarding users with optional fields', async () => {
    const res = await populateAdminService();
    const externalUuid1 = uuidv4();
    const externalUuid2 = uuidv4();
    const externalUuid3 = uuidv4();
    const externalUuid4 = uuidv4();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(1)
      .addValidClassesToEachSchool(2)
      .addUser({ username: '', externalUuid: externalUuid1 })
      .addUser({ email: '', externalUuid: externalUuid2 })
      .addUser({ phone: '', externalUuid: externalUuid3 })
      .addUser({ dateOfBirth: '', externalUuid: externalUuid4 })
      .finalize();
    const result = await onboard(reqs, global.client);

    expect(requestAndResponseIdsMatch(reqs, result)).to.be.true;

    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;

    const returnedUser1 = await getUser(externalUuid1);
    const returnedUser2 = await getUser(externalUuid2);
    const returnedUser3 = await getUser(externalUuid3);
    const returnedUser4 = await getUser(externalUuid4);

    expect(returnedUser1).to.be.not.undefined;
    expect(returnedUser1.username).to.be.null;
    expect(returnedUser1.externalUuid).to.equal(externalUuid1);
    expect(returnedUser2).to.be.not.undefined;
    expect(returnedUser2.email).to.be.null;
    expect(returnedUser2.externalUuid).to.equal(externalUuid2);
    expect(returnedUser3).to.be.not.undefined;
    expect(returnedUser3.phone).to.be.null;
    expect(returnedUser3.externalUuid).to.equal(externalUuid3);
    expect(returnedUser4).to.be.not.undefined;
    expect(returnedUser4.dateOfBirth).to.be.null;
    expect(returnedUser4.externalUuid).to.equal(externalUuid4);
  }).timeout(50000);

  it('fail the user onboarding if none of the fields email or phone or username was provided', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(2)
      .addValidClassesToEachSchool(2)
      .addCustomizableUser({ email: '', phone: '', username: '' })
      .finalize();
    const result = await onboard(reqs, global.client);

    expect(requestAndResponseIdsMatch(reqs, result)).to.be.true;

    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
  }).timeout(50000);

  it('fail the user onboarding if he does not have a role', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(5)
      .addUser({ roleIdentifiersList: [''] }, false)
      .finalize();
    const result = await onboard(reqs, global.client);

    expect(requestAndResponseIdsMatch(reqs, result)).to.be.true;

    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
  }).timeout(50000);

  it('handle adding user with capital letters in email', async () => {
    const res = await populateAdminService();
    const org: IdNameMapper = res.keys().next().value;
    const userId = uuidv4();
    const email = `AbA${random()}@email.com`;
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addUser({
        addToValidSchools: 0,
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: userId,
        email,
      })
      .finalize();
    const result = await onboard(reqs, global.client);

    expect(requestAndResponseIdsMatch(reqs, result)).to.be.true;
    const allSuccess = result
      .toObject()
      .responsesList.every((response) => response.success === true);
    expect(allSuccess).to.be.true;

    const user = await getUser(userId);
    expect(user.email).to.be.eql(email.toLowerCase());
  }).timeout(50000);

  it('user onboarding with username and missing email/phone', async () => {
    const res = await populateAdminService();
    const userId = uuidv4();
    const username = random();

    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addUser({
        email: '',
        phone: '',
        username: username,
        addToValidClasses: 0,
        addToValidSchools: 0,
        addToValidOrgs: 1,
        externalUuid: userId,
      })
      .finalize();

    const result = await onboard(reqs, global.client);

    expect(requestAndResponseIdsMatch(reqs, result)).to.be.true;

    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;

    const adminUser = await getUser(userId);
    expect(adminUser.username).to.be.equal(username);
    expect(adminUser.email).to.be.null;
    expect(adminUser.phone).to.be.null;
  }).timeout(50000);
}).timeout(50000);
