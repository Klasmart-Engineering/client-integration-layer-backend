import { v4 as uuidv4 } from 'uuid';

import { proto, grpc, Context, protobufToEntity } from 'cil-lib';
import { expect } from 'chai';
import { OnboardingServer } from '../../src/lib/api';
import { LOG_STUB, onboard, populateAdminService } from '../util';
import { TestCaseBuilder } from '../util/testCases';
import {
  parseRequests,
  parseResponsesForErrorIds,
  parseResponsesForErrorMessages,
  parseResponsesForSuccesses,
} from '../util/parseRequest';

const { OnboardingClient } = proto;

describe('When receiving requests over the web the server should', () => {
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

  it('succeed with a larger valid series of deterministic inputs', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(10)
      .addValidUsersToEachSchool(100, 10)
      .finalize();
    const result = await onboard(reqs, client);
    const successes = parseResponsesForSuccesses(result);
    expect(successes).to.eql({
      orgs: 1,
      schools: 5,
      classes: 50,
      users: 550,
    });
    const errorMessages = parseResponsesForErrorMessages(result);
    for (const value of errorMessages.values()) {
      expect(value.size).to.equal(0);
    }
    // query the data in order to see if it exists
  }).timeout(50000);

  it('succeed with very large deterministic inputs', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(1)
      .addValidClassesToEachSchool(100)
      .addValidUsersToEachSchool(2500, 20)
      .finalize();
    const result = await onboard(reqs, client);
    const successes = parseResponsesForSuccesses(result);
    expect(successes).to.eql({
      orgs: 1,
      schools: 1,
      classes: 100,
      users: 2520,
    });
    const errorMessages = parseResponsesForErrorMessages(result);
    for (const value of errorMessages.values()) {
      expect(value.size).to.equal(0);
    }
    // query the data in order to see if it exists
  }).timeout(50000);

  it('only expose external uuids', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(10)
      .addValidUsersToEachSchool(100, 10)
      .finalize();
    const validIds = parseRequests(reqs);
    const result = await onboard(reqs, client);

    for (const resp of result.getResponsesList()) {
      const k = resp.getEntity();
      const id = resp.getEntityId();
      const s = validIds.get(k);
      expect(
        s.has(id),
        `The id ${id} is not a valid external ID that we provided in the request for the entity ${protobufToEntity(
          k,
          LOG_STUB
        )}`
      ).to.be.true;
    }
  }).timeout(50000);

  it('fail to onboard a school and subsequent children when the school is invalid', async () => {
    const res = await populateAdminService();
    const invalidSchoolId = uuidv4();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(2)
      .addSchool({ externalUuid: invalidSchoolId, name: '' }, false)
      .addValidClassesToEachSchool(5)
      .addValidUsersToEachSchool(10, 1, 5)
      .finalize();
    const result = await onboard(reqs, client);
    const errors = parseResponsesForErrorIds(result);
    const schoolErrors = errors.get(proto.Entity.SCHOOL);
    const classErrors = errors.get(proto.Entity.CLASS);
    const userErrors = errors.get(proto.Entity.USER);
    expect(schoolErrors.values().next().value).to.equal(invalidSchoolId);
    expect(Array.from(classErrors.values())).to.have.lengthOf(5);
    expect(Array.from(userErrors)).to.have.lengthOf(11);
  }).timeout(50000);

  it('fail the class onboarding when the school does not exist in the system as a pre-requisite', async () => {
    const res = await populateAdminService();
    const invalidSchoolId = uuidv4();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      // adding one class and link it to an non-existing school
      .addClass({ externalSchoolUuid: invalidSchoolId }, false)
      .finalize();
    const result = await onboard(reqs, client);
    const errors = parseResponsesForErrorMessages(result);
    const classErrors = errors.get(proto.Entity.CLASS);
    expect(classErrors.keys().next().value).to.not.be.undefined;
    const errorMsg = classErrors.values().next().value as string[];
    expect(errorMsg[0]).to.equal(
      `School with id ${invalidSchoolId} does not exist`
    );
  }).timeout(50000);

  it('fail the school onboarding when the organization does not exist in the system as a pre-requisite', async () => {
    const invalidOrgId = uuidv4();
    const reqs = new TestCaseBuilder()
      .addSchool({ externalOrganizationUuid: invalidOrgId }, false)
      .finalize();
    const result = await onboard(reqs, client);
    const errorsMessages = parseResponsesForErrorMessages(result);
    const schoolErrors = errorsMessages.get(proto.Entity.SCHOOL);
    const allFailed = result
      .toObject()
      .responsesList.every((r) => r.success === false);
    expect(allFailed).to.be.true;
    expect(schoolErrors.values().next().value[0]).to.be.equal(
      `Organization with id ${invalidOrgId} does not exist`
    );
  }).timeout(50000);

  it('fail the user onboarding when the role does not exist in the system as a pre-requisite', async () => {
    const invalidUserId = uuidv4();
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(1)
      .addValidClassesToEachSchool(2)
      .addUser()
      .addUser(
        { externalUuid: invalidUserId, roleIdentifiersList: ['custom role'] },
        false
      )
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
    const errorsMessages = parseResponsesForErrorMessages(result);
    expect(errorsMessages.get(proto.Entity.ORGANIZATION).size).to.be.equal(0);
    expect(errorsMessages.get(proto.Entity.SCHOOL).size).to.be.equal(0);
    expect(errorsMessages.get(proto.Entity.CLASS).size).to.be.equal(0);
    const userErrors = errorsMessages.get(proto.Entity.USER);
    expect(userErrors.size).to.be.equal(1);
    const userErrs = userErrors.get(invalidUserId);
    expect(userErrs).to.not.be.undefined;
    expect(userErrs[0]).to.include('Roles: custom role are invalid');
  }).timeout(50000);

  it('fail the user onboarding when the class does not exist in the system as a pre-requisite', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5);
    expect(() => {
      reqs.addValidUsers(10);
    }).to.throw(
      'Cannot add a user to more valid classes than are currently configured'
    );
  }).timeout(50000);

  it('fail onboarding users whose classes does not exist in the system as a pre-requisite', async () => {
    const schoolsPerOrg = 30;
    const numberOfStudentsPerSchool = 50;
    const numberOfTeachersPerSchool = 10;
    const addEachUserToNClasses = 3;

    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(100);

    for (let i = 1; i <= schoolsPerOrg; i++) {
      expect(() => {
        reqs.addValidUsersToEachSchool(
          numberOfStudentsPerSchool,
          numberOfTeachersPerSchool,
          addEachUserToNClasses
        );
      }).to.throw(
        `Cannot add a user to ${addEachUserToNClasses} as the school only has 0 configured`
      );
    }
  }).timeout(50000);

  it('fail onboarding users whose schools they should be mapped in do not exist in the system as a pre-requisite', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder().addValidOrgs(res);
    expect(() => {
      reqs.addValidUsers(10);
    }).to.throw(
      'Cannot add a user to more valid schools than are currently configured'
    );
  }).timeout(50000);

  it('fail onboarding users whose org they should be mapped in do not exist in the system as a pre-requisite', async () => {
    const reqs = new TestCaseBuilder().addValidSchools(10);
    expect(() => {
      reqs.addValidUsers(10);
    }).to.throw(
      'Cannot add a user to more valid organizations than are currently configured'
    );
  }).timeout(50000);

  it('fail the class onboarding if its programs do not exist in the system as a pre-requisite', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addClass(
        { programs: ['UNDEFINED-PROGRAM1', 'UNDEFINED-PROGRAM2'] },
        false
      )
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
  }).timeout(50000);

  it('fail the user onboarding if email is invalid', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(5)
      .addCustomizableUser({ email: '.notvalid' })
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
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
    const result = await onboard(reqs, client);
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
      .addCustomizableUser({ username: invalidUsername })
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;
  }).timeout(50000);

  it('fail the user onboarding if phone format is wrong', async () => {
    const res = await populateAdminService();
    let invalidPhone = '34o';
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(5)
      .addCustomizableUser({ phone: invalidPhone })
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
    // Invalid phone number
  }).timeout(50000);

  // fails
  it('fail onboarding a user which already exists in the system', async () => {
    const res = await populateAdminService();
    const userID = uuidv4();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(2)
      .addValidClassesToEachSchool(2)
      .addCustomizableUser({ isDuplicate: true, userID: userID })
      .addCustomizableUser({ isDuplicate: true, userID: userID })
      // .addCustomizableUser({isDuplicate: true, userID: userID})
      .finalize();
    const result = await onboard(reqs, client);
    // console.log(result.toObject())
    // Entity already exists
    // 32 responses
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
  }).timeout(50000);

  it('fail the user onboarding if none of the fields email or phone was provided', async () => {
    const res = await populateAdminService();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(2)
      .addValidClassesToEachSchool(2)
      .addCustomizableUser({ email: '', phone: '' })
      .finalize();
    const result = await onboard(reqs, client);
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
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
  }).timeout(50000);

  it('fail the users onboarding if 5 users are valid and 5 are invalid', async () => {
    const res = await populateAdminService();
    let builder = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(8)
      .addValidUsersToEachSchool(5);

    for (let i = 0; i < 5; i++) {
      builder = builder.addCustomizableUser({ email: '', phone: '' }, false);
    }
    const reqs = builder.finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
    // "Users: [id] do not belong to the same parent school as the class [id]. When attempting to add users to a class they must share the same parent school"
  }).timeout(50000);

  it('succeed onboarding school if the organization already exists', async () => {
    const res = await populateAdminService();
    let orgId;
    for (let key of res.keys()) {
      orgId = key.id;
    }
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool({ externalOrganizationUuid: orgId }, true)
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;
  }).timeout(50000);

  it('succeed onboarding class if the school already exists', async () => {
    const res = await populateAdminService();
    let orgId;
    for (let key of res.keys()) {
      orgId = key.id;
    }
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool({ externalOrganizationUuid: orgId }, true)
      .addClass({ externalOrganizationUuid: orgId }, true)
      .finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;
  }).timeout(50000);
}).timeout(50000);
