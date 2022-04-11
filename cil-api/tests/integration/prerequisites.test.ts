import { v4 as uuidv4 } from 'uuid';

import { proto, grpc, Context } from 'cil-lib';
import { expect } from 'chai';
import { OnboardingServer } from '../../src/lib/api';
import { onboard, populateAdminService } from '../util';
import { TestCaseBuilder } from '../util/testCases';
import {
  parseResponsesForErrorIds,
  parseResponsesForErrorMessages,
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
}).timeout(50000);
