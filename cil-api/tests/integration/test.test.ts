import { v4 as uuidv4 } from 'uuid';

import { proto, grpc, Context, protobufToEntity, ExternalUuid } from 'cil-lib';
import { expect } from 'chai';
import { OnboardingServer } from '../../src/lib/api';
import {
  getDbProgram,
  getDbRole,
  LOG_STUB,
  onboard,
  populateAdminService,
  random,
  wrapRequest,
} from '../util';
import { TestCaseBuilder } from '../util/testCases';
import {
  parseRequests,
  parseResponsesForErrorIds,
  parseResponsesForErrorMessages,
  parseResponsesForSuccesses,
} from '../util/parseRequest';
import {
  createOrg as createOrgInAdminService,
  createProgramsAndRoles as createRolesAndProgramsInAdminService,
} from '../util/populateAdminService';
import {
  getSchool,
  getSchoolClasses,
  getSchoolPrograms,
  getSchoolUsers,
} from '../util/school';
import { getClass, getClassProgramsConnections } from '../util/class';
import { deleteUsers, getUser, getUserOrgRoles, setUpUser } from '../util/user';
import { IdNameMapper } from 'cil-lib/dist/main/lib/services/adminService';
import {
  AddOrganizationRolesToUser,
  AddProgramsToClass,
  AddUsersToClass,
  AddUsersToOrganization,
  OnboardingRequest,
} from 'cil-lib/dist/main/lib/protos';
import { getClassConnections } from '../util/class';

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
    const testCase = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(5)
      .addValidUsersToEachSchool(10, 1, 3);
    const reqs = testCase.finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;

    await assertSchoolUsersInAdmin(testCase);
  }).timeout(50000);

  it('succeed with a larger valid series of deterministic inputs', async () => {
    const res = await populateAdminService();
    const testCase = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(10)
      .addValidUsersToEachSchool(100, 10);
    const reqs = testCase.finalize();
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

    await assertSchoolUsersInAdmin(testCase);
  }).timeout(50000);

  it('succeed with very large deterministic inputs', async () => {
    const res = await populateAdminService();
    const testCase = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(1)
      .addValidClassesToEachSchool(100)
      .addValidUsersToEachSchool(2500, 20);
    const reqs = testCase.finalize();
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

    await assertSchoolUsersInAdmin(testCase);
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
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;

    const returnedUser = await getUser(externalUuid);
    expect(returnedUser).to.be.not.undefined;
    expect(returnedUser).to.have.property('username');
    expect(returnedUser.username).to.be.equal(invalidUsername);
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

  it.skip(
    'fail onboarding a user which already exists in the system',
    async () => {
      const res = await populateAdminService();
      const externalUuid = uuidv4();
      const org = res.keys().next().value;

      const user = setUpUser(org.id, externalUuid);
      const result = await (
        await onboard(
          wrapRequest([
            new proto.OnboardingRequest().setOrganization(
              new proto.Organization().setExternalUuid(org.id).setName(org.name)
            ),
            new proto.OnboardingRequest().setUser(user),
          ]),
          client
        )
      ).toObject().responsesList;
      const allSuccess = result.every((r) => r.success === true);
      expect(allSuccess).to.be.true;

      const returnedUser = await getUser(externalUuid);
      expect(returnedUser).to.be.not.undefined;

      await deleteUsers([externalUuid]);

      const dupe = await (
        await onboard(
          wrapRequest([new proto.OnboardingRequest().setUser(user)]),
          client
        )
      ).toObject().responsesList;

      expect(dupe).to.be.length(1);
      expect(dupe.every((r) => r.success === true)).to.be.false;
      expect(dupe.every((r) => r.errors)).to.be.true;
      expect(dupe.every((r) => r.errors.entityAlreadyExists)).to.be.true;
    }
  ).timeout(50000);

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
    const result = await onboard(reqs, client);
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

  it('succeed adding programs & roles after organization has already been onboarded', async () => {
    const orgName = uuidv4().substring(0, 8);
    const externalOrgId = uuidv4();

    const orgId = await createOrgInAdminService(orgName, LOG_STUB);

    const req = wrapRequest([
      new OnboardingRequest().setOrganization(
        new proto.Organization().setExternalUuid(externalOrgId).setName(orgName)
      ),
    ]);
    const setUpResponse = await onboard(req, client);
    expect(
      setUpResponse.toObject().responsesList.every((r) => r.success === true)
    ).to.be.true;

    const roleName = uuidv4().substring(0, 8);
    const programName = uuidv4().substring(0, 8);
    await createRolesAndProgramsInAdminService(
      orgId,
      [roleName],
      [programName]
    );

    const result = await onboard(req, client);

    expect(result.toObject().responsesList.every((r) => r.success === true)).to
      .be.true;

    const role = await getDbRole(roleName, externalOrgId);
    expect(role).to.be.not.undefined;
    expect(role.name).to.be.equal(roleName);
    expect(role.externalOrgUuid).to.be.equal(externalOrgId);

    const program = await getDbProgram(programName, externalOrgId);
    expect(program).to.be.not.undefined;
    expect(program.name).to.be.equal(programName);
    expect(program.externalOrgUuid).to.be.equal(externalOrgId);
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
    const schoolId = uuidv4();
    const schoolName = uuidv4().substring(0, 8);
    const org = res.keys().next().value;
    const testCase = new TestCaseBuilder().addValidOrgs(res).addSchool({
      externalOrganizationUuid: org.id,
      externalUuid: schoolId,
      name: schoolName,
    });
    const reqs = testCase.finalize();
    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.true;
    expect(
      result.getResponsesList().map((response) => response.getEntityId())
    ).includes.members([schoolId]);
    const school = await getSchool(schoolId);
    expect(school).to.be.not.undefined;
    expect(school.externalUuid).to.be.equal(schoolId);
    expect(school.name).to.be.equal(schoolName);
    expect(school.externalOrgUuid).to.be.equal(org.id);

    const programs = await getSchoolPrograms(schoolId);
    expect(programs.map((program) => program.name)).to.includes.members(
      testCase.getProgramsForSchool(schoolId)
    );
  }).timeout(50000);

  it('handle dupe adding users to classes that already exists', async () => {
    const res = await populateAdminService();
    const org: IdNameMapper = res.keys().next().value;
    const classId = uuidv4();
    const teacherId1 = uuidv4();
    const teacherId2 = uuidv4();
    const teacherId3 = uuidv4();
    const studentId1 = uuidv4();
    const studentId2 = uuidv4();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool({ externalOrganizationUuid: org.id })
      .addClass({ externalOrganizationUuid: org.id, externalUuid: classId })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: teacherId1,
        isTeacher: true,
      })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: teacherId2,
        isTeacher: true,
      })
      .addUser({
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: teacherId3,
        isTeacher: true,
      })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: studentId1,
        isTeacher: false,
      })
      .addUser({
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: studentId2,
        isTeacher: false,
      })
      .finalize();
    const setUp = await onboard(reqs, client);
    const allSuccess = setUp
      .toObject()
      .responsesList.every((response) => response.success === true);
    expect(allSuccess).to.be.true;

    const request = new OnboardingRequest().setLinkEntities(
      new proto.Link().setAddUsersToClass(
        new AddUsersToClass()
          .setExternalClassUuid(classId)
          .setExternalTeacherUuidList([teacherId1, teacherId2, teacherId3])
          .setExternalStudentUuidList([studentId1, studentId2])
      )
    );

    const result = await (
      await onboard(wrapRequest([request]), client)
    ).toObject().responsesList;
    expect(result.filter((resp) => resp.success === true)).to.be.length(2);
    expect(result.filter((resp) => resp.success === false)).to.be.length(3);
    expect(result.filter((r) => r.errors)).to.be.length(3);
    expect(
      result
        .filter((resp) => resp.errors)
        .filter((resp) => resp.errors.entityAlreadyExists)
    ).to.be.length(3);
    expect(result.map((resp) => resp.entityId)).to.includes.members([
      teacherId1,
      teacherId2,
      teacherId3,
      studentId1,
      studentId2,
    ]);

    const classConnections = await getClassConnections(classId);
    expect(
      classConnections.students.map((a) => a.externalUuid)
    ).to.includes.members([studentId1, studentId2]);
    expect(
      classConnections.teachers.map((a) => a.externalUuid)
    ).to.includes.members([teacherId1, teacherId2, teacherId3]);
  }).timeout(50000);

  it('handle all dupe adding users to classes that already exists', async () => {
    const res = await populateAdminService();
    const org: IdNameMapper = res.keys().next().value;
    const classId = uuidv4();
    const teacherId1 = uuidv4();
    const teacherId2 = uuidv4();
    const studentId1 = uuidv4();
    const studentId2 = uuidv4();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool({ externalOrganizationUuid: org.id })
      .addClass({ externalOrganizationUuid: org.id, externalUuid: classId })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: teacherId1,
        isTeacher: true,
      })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: teacherId2,
        isTeacher: true,
      })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: studentId1,
        isTeacher: false,
      })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: studentId2,
        isTeacher: false,
      })
      .finalize();
    const setUp = await onboard(reqs, client);
    const allSuccess = setUp
      .toObject()
      .responsesList.every((response) => response.success === true);
    expect(allSuccess).to.be.true;

    const request = new OnboardingRequest().setLinkEntities(
      new proto.Link().setAddUsersToClass(
        new AddUsersToClass()
          .setExternalClassUuid(classId)
          .setExternalTeacherUuidList([teacherId1, teacherId2])
          .setExternalStudentUuidList([studentId1, studentId2])
      )
    );

    const result = await (
      await onboard(wrapRequest([request]), client)
    ).toObject().responsesList;
    expect(result.filter((resp) => resp.success === false)).to.be.length(4);
    expect(result.filter((r) => r.errors)).to.be.length(4);
    expect(
      result
        .filter((resp) => resp.errors)
        .filter((resp) => resp.errors.entityAlreadyExists)
    ).to.be.length(4);
    expect(result.map((resp) => resp.entityId)).to.includes.members([
      teacherId1,
      teacherId2,
      studentId1,
      studentId2,
    ]);

    const classConnections = await getClassConnections(classId);
    expect(
      classConnections.students.map((a) => a.externalUuid)
    ).to.includes.members([studentId1, studentId2]);
    expect(
      classConnections.teachers.map((a) => a.externalUuid)
    ).to.includes.members([teacherId1, teacherId2]);
  }).timeout(50000);

  it('handle teachers that have already been on-boarded, filter them out and attempt to onboard the new teacher', async () => {
    const res = await populateAdminService();
    const org: IdNameMapper = res.keys().next().value;
    const classId = uuidv4();
    const teacherId1 = uuidv4();
    const teacherId2 = uuidv4();
    const teacherId3 = uuidv4();
    const setUpRequest = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool({ externalOrganizationUuid: org.id })
      .addClass({ externalOrganizationUuid: org.id, externalUuid: classId })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: teacherId1,
        isTeacher: true,
      })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: teacherId2,
        isTeacher: true,
      })
      .addUser({
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: teacherId3,
        isTeacher: true,
      })
      .finalize();
    const setUpResult = await (
      await onboard(setUpRequest, client)
    ).getResponsesList();
    expect(setUpResult.every((response) => response.getSuccess() === true)).to
      .be.true;
    expect(setUpResult.map((result) => result.getEntityId())).includes.members([
      teacherId1,
      teacherId2,
      teacherId3,
      classId,
    ]);

    const result = await (
      await onboard(
        wrapRequest([
          addTeachersToClassReq(classId, [teacherId1]),
          addTeachersToClassReq(classId, [teacherId2, teacherId3]),
        ]),
        client
      )
    ).getResponsesList();

    expect(result).to.be.length(3);
    expect(result.filter((resp) => resp.getSuccess() === true)).to.be.length(1);
    expect(result.filter((resp) => resp.getErrors())).to.be.length(2);

    expect(
      result
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getEntityAlreadyExists())
    ).to.be.length(2);
    expect(result.map((resp) => resp.getEntityId())).to.includes.members([
      teacherId1,
      teacherId2,
      teacherId3,
    ]);

    const classConnections = await getClassConnections(classId);
    expect(
      classConnections.teachers.map((teacher) => teacher.externalUuid)
    ).to.includes.members([teacherId1, teacherId2, teacherId3]);
  }).timeout(50000);

  it('handle students that have already been on-boarded, filter them out and attempt to onboard the new teacher', async () => {
    const res = await populateAdminService();
    const org: IdNameMapper = res.keys().next().value;
    const classId = uuidv4();
    const student1 = uuidv4();
    const student2 = uuidv4();
    const student3 = uuidv4();
    const schoolId = uuidv4();
    const setUpRequest = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool({ externalUuid: schoolId, externalOrganizationUuid: org.id })
      .addClass({ externalOrganizationUuid: org.id, externalUuid: classId })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: student1,
        isTeacher: false,
      })
      .addUser({
        addToValidClasses: 1,
        externalOrganizationUuid: org.id,
        externalUuid: student2,
        isTeacher: false,
      })
      .addUser({
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: student3,
        isTeacher: false,
      })
      .finalize();
    const setUpResult = await (
      await onboard(setUpRequest, client)
    ).getResponsesList();
    expect(setUpResult.every((response) => response.getSuccess() === true)).to
      .be.true;
    expect(setUpResult.map((result) => result.getEntityId())).includes.members([
      student1,
      student2,
      student3,
      classId,
    ]);

    const result = await (
      await onboard(
        wrapRequest([
          addStudentsToClassReq(classId, [student1]),
          addStudentsToClassReq(classId, [student2, student3]),
        ]),
        client
      )
    ).getResponsesList();

    expect(result).to.be.length(3);
    expect(result.filter((resp) => resp.getSuccess() === true)).to.be.length(1);
    expect(result.filter((resp) => resp.getErrors())).to.be.length(2);

    expect(
      result
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getEntityAlreadyExists())
    ).to.be.length(2);
    expect(result.map((resp) => resp.getEntityId())).to.includes.members([
      student1,
      student2,
      student3,
    ]);

    const classConnections = await getClassConnections(classId);
    expect(
      classConnections.students.map((student) => student.externalUuid)
    ).to.includes.members([student1, student2, student3]);
  }).timeout(50000);

  it('handle adding users to org that already exists', async () => {
    const res = await populateAdminService();
    const org: IdNameMapper = res.keys().next().value;
    const userId1 = uuidv4();
    const userId2 = uuidv4();
    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addUser({
        addToValidSchools: 0,
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: userId1,
      })
      .addUser({
        addToValidSchools: 0,
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: userId2,
      })
      .finalize();
    const setUp = await onboard(reqs, client);
    const allSuccess = setUp
      .toObject()
      .responsesList.every((response) => response.success === true);
    expect(allSuccess).to.be.true;

    const request = new OnboardingRequest().setLinkEntities(
      new proto.Link().setAddUsersToOrganization(
        new AddUsersToOrganization()
          .setExternalOrganizationUuid(org.id)
          .setRoleIdentifiersList(['TEST ROLE 1'])
          .setExternalUserUuidsList([userId1, userId2])
      )
    );

    const result = await (
      await onboard(wrapRequest([request]), client)
    ).toObject().responsesList;
    expect(result.filter((resp) => resp.success === false)).to.be.length(2);
    expect(result.filter((r) => r.errors)).to.be.length(2);
    expect(
      result
        .filter((resp) => resp.errors)
        .filter((resp) => resp.errors.entityAlreadyExists)
    ).to.be.length(2);
    expect(result.map((resp) => resp.entityId)).to.includes.members([
      userId1,
      userId2,
    ]);

    const user1 = await getUser(userId1);
    expect(user1.externalOrgIds).to.include.members([org.id]);
    const user2 = await getUser(userId2);
    expect(user2.externalOrgIds).to.include.members([org.id]);
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
    const setUp = await onboard(reqs, client);
    const allSuccess = setUp
      .toObject()
      .responsesList.every((response) => response.success === true);
    expect(allSuccess).to.be.true;

    const user = await getUser(userId);
    expect(user.email).to.be.eql(email.toLowerCase());
  }).timeout(50000);

  it('succeed onboarding class if the school already exists', async () => {
    const res = await populateAdminService();
    const schoolId = uuidv4();
    const classId = uuidv4();
    const org = res.keys().next().value;
    const className = uuidv4().substring(0, 8);
    const schoolName = uuidv4().substring(0, 8);

    const reqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool(
        {
          name: schoolName,
          externalUuid: schoolId,
          externalOrganizationUuid: org.id,
        },
        true
      )
      .addClass(
        {
          name: className,
          externalUuid: classId,
          externalSchoolUuid: schoolId,
          externalOrganizationUuid: org.id,
        },
        true
      )
      .finalize();

    const result = await onboard(reqs, client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);

    const returnedSchool = await getSchool(schoolId);
    expect(returnedSchool).to.be.not.undefined;
    expect(returnedSchool.externalUuid).to.be.equal(schoolId);
    expect(returnedSchool.name).to.be.equal(schoolName);
    expect(returnedSchool.externalOrgUuid).to.be.equal(org.id);

    const returnedClass = await getClass(classId, schoolId);
    expect(returnedClass).to.be.not.undefined;
    expect(returnedClass.externalUuid).to.be.equal(classId);
    expect(returnedClass.name).to.be.equal(className);
    expect(returnedClass.externalOrgUuid).to.be.equal(org.id);

    const returnedClasses = await getSchoolClasses(schoolId);
    expect(returnedClasses).to.deep.include({
      klUuid: returnedClass.id,
      externalUuid: returnedClass.externalUuid,
    });

    expect(allSuccess).to.be.true;
  }).timeout(50000);

  it('succeed adding new org roles to user', async () => {
    const res = await populateAdminService();
    const org: IdNameMapper = res.keys().next().value;
    const orgRoles: string[] = res
      .values()
      .next()
      .value.roles.map((role) => role.name);
    const rolesMap = new Map<string, string[]>();
    rolesMap.set(org.id, [orgRoles[0]]);
    const user = uuidv4();

    // Onboard User with just one of the valid Org roles
    const reqs = new TestCaseBuilder()
      .setShouldOptimizeLinks(false)
      .addValidOrgs(res)
      .addUser({
        addToValidClasses: 0,
        addToValidSchools: 0,
        externalOrganizationUuid: org.id,
        externalUuid: user,
        roles: rolesMap,
      })
      .finalize();

    const setUp = await onboard(reqs, client);
    const allSuccess = setUp
      .toObject()
      .responsesList.every((response) => response.success === true);
    expect(allSuccess).to.be.true;

    const rolesFirst = await getUserOrgRoles(org.id, user);
    expect(rolesFirst).to.not.include(orgRoles[1]);

    // Add a new valid Org role to User
    const request = new OnboardingRequest().setLinkEntities(
      new proto.Link().setAddOrganizationRolesToUser(
        new AddOrganizationRolesToUser()
          .setExternalOrganizationUuid(org.id)
          .setExternalUserUuid(user)
          .setRoleIdentifiersList([orgRoles[1]])
      )
    );

    await onboard(wrapRequest([request]), client);

    const roles = await getUserOrgRoles(org.id, user);
    expect(roles).to.include(orgRoles[1]);
  }).timeout(50000);

  it('succeed when trying to link programs to class with the same classId1 and one independent classId2 ', async () => {
    const res = await populateAdminService();
    const schoolId = uuidv4();
    const classId1 = uuidv4();
    const classId2 = uuidv4();
    const org = res.keys().next().value;
    const className1 = uuidv4().substring(0, 8);
    const className2 = uuidv4().substring(0, 8);
    const schoolName = uuidv4().substring(0, 8);

    const setUpReqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool(
        {
          name: schoolName,
          externalUuid: schoolId,
          externalOrganizationUuid: org.id,
        },
        true
      )
      .addClass(
        {
          name: className1,
          externalUuid: classId1,
          externalSchoolUuid: schoolId,
          externalOrganizationUuid: org.id,
        },
        true,
        false
      ) // flag set to false to not link the programs with the class. We want to create our own links
      .addClass(
        {
          name: className2,
          externalUuid: classId2,
          externalSchoolUuid: schoolId,
          externalOrganizationUuid: org.id,
        },
        true,
        false
      ) // flag set to false to not link the programs with the class. We want to create our own links
      .finalize();

    const setUpResult = await onboard(setUpReqs, client);
    const setUpSuccess = setUpResult
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(setUpSuccess).to.be.true;
    expect(
      setUpResult.getResponsesList().map((result) => result.getEntityId())
    ).includes.members([classId1, classId2, schoolId]);
    const result = await await onboard(
      wrapRequest([
        addProgramsToClassReq(classId1, ['TEST PROGRAM 1']),
        addProgramsToClassReq(classId1, ['TEST PROGRAM 2']),
        addProgramsToClassReq(classId2, ['TEST PROGRAM 3']),
      ]),
      client
    );

    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);

    expect(result.getResponsesList()).to.be.length(3);
    expect(
      result.getResponsesList().filter((resp) => resp.getSuccess() === true)
    ).to.be.length(3);
    expect(
      result.getResponsesList().map((resp) => resp.getEntityId())
    ).to.includes.members([classId1, classId2]);

    const class1ProgramsConnections = await getClassProgramsConnections(
      classId1
    );
    expect(
      class1ProgramsConnections.programs.map((program) => program.name)
    ).to.includes.members(['TEST PROGRAM 1', 'TEST PROGRAM 2']);

    const class2ProgramsConnections = await getClassProgramsConnections(
      classId2
    );
    expect(
      class2ProgramsConnections.programs.map((program) => program.name)
    ).to.includes.members(['TEST PROGRAM 3']);

    expect(allSuccess).to.be.true;
  });

  it('partially succeed when trying to link programs with the same classId1 and same classId2', async () => {
    const res = await populateAdminService();
    const schoolId = uuidv4();
    const classId1 = uuidv4();
    const classId2 = uuidv4();
    const org = res.keys().next().value;
    const className1 = uuidv4().substring(0, 8);
    const className2 = uuidv4().substring(0, 8);
    const schoolName = uuidv4().substring(0, 8);

    const setUpReqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool(
        {
          name: schoolName,
          externalUuid: schoolId,
          externalOrganizationUuid: org.id,
        },
        true
      )
      .addClass(
        {
          name: className1,
          externalUuid: classId1,
          externalSchoolUuid: schoolId,
          externalOrganizationUuid: org.id,
        },
        true,
        false
      ) // flag set to false to not link the programs with the class. We want to create our own links
      .addClass(
        {
          name: className2,
          externalUuid: classId2,
          externalSchoolUuid: schoolId,
          externalOrganizationUuid: org.id,
        },
        true,
        false
      ) // flag set to false to not link the programs with the class. We want to create our own links
      .finalize();

    const setUpResult = await onboard(setUpReqs, client);
    const setUpSuccess = setUpResult
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(setUpSuccess).to.be.true;
    expect(
      setUpResult.getResponsesList().map((result) => result.getEntityId())
    ).includes.members([classId1, classId2, schoolId]);

    const result = await onboard(
      wrapRequest([
        addProgramsToClassReq(classId1, ['TEST PROGRAM 1']),
        addProgramsToClassReq(classId1, ['TEST PROGRAM 2']),
        addProgramsToClassReq(classId1, [
          'TEST PROGRAM 1',
          'TEST PROGRAM 2',
          'TEST PROGRAM 3',
        ]),
        addProgramsToClassReq(classId1, ['TEST PROGRAM 3', 'TEST PROGRAM 4']),
        addProgramsToClassReq(classId1, ['TEST PROGRAM 1', 'TEST PROGRAM 2']),
        addProgramsToClassReq(classId2, ['TEST PROGRAM 1', 'TEST PROGRAM 2']),
        addProgramsToClassReq(classId2, ['TEST PROGRAM 1', 'TEST PROGRAM 2']),
        addProgramsToClassReq(classId2, ['TEST PROGRAM 3']),
        addProgramsToClassReq(classId2, ['TEST PROGRAM 3', 'TEST PROGRAM 4']),
        addProgramsToClassReq(classId2, [
          'TEST PROGRAM 1',
          'TEST PROGRAM 2',
          'TEST PROGRAM 3',
          'TEST PROGRAM 4',
        ]),
      ]),
      client
    );

    expect(result.getResponsesList()).to.be.length(19);

    expect(
      result.getResponsesList().filter((resp) => resp.getSuccess() === true)
    ).to.be.length(7);
    expect(
      result.getResponsesList().filter((resp) => resp.getErrors())
    ).to.be.length(12);
    expect(
      result
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getEntityAlreadyExists())
    ).to.be.length(12);

    expect(
      result.getResponsesList().map((resp) => resp.getEntityId())
    ).to.includes.members([classId1, classId2]);

    expect(
      result
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getEntityAlreadyExists())
        .filter((resp) => resp.getEntityId() === classId1)
    ).to.be.length(5);

    expect(
      result
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getEntityAlreadyExists())
        .filter((resp) => resp.getEntityId() === classId2)
    ).to.be.length(7);

    const class1ProgramsConnections = await getClassProgramsConnections(
      classId1
    );
    expect(
      class1ProgramsConnections.programs.map((program) => program.name)
    ).to.includes.members([
      'TEST PROGRAM 1',
      'TEST PROGRAM 2',
      'TEST PROGRAM 3',
      'TEST PROGRAM 4',
    ]);

    const class2ProgramsConnections = await getClassProgramsConnections(
      classId2
    );
    expect(
      class2ProgramsConnections.programs.map((program) => program.name)
    ).to.includes.members([
      'TEST PROGRAM 1',
      'TEST PROGRAM 2',
      'TEST PROGRAM 3',
      'TEST PROGRAM 4',
    ]);
  });

  it('succeed when onboarding more than 50 users and linked them to school, then onboard the same batch again and not get any internal server errors', async () => {
    const res = await populateAdminService();
    const org: IdNameMapper = res.keys().next().value;
    const classId = uuidv4();
    const schoolId = uuidv4();

    const setUpRequest = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool({ externalUuid: schoolId, externalOrganizationUuid: org.id })
      .addClass({ externalOrganizationUuid: org.id, externalUuid: classId })
      .addValidUsersToEachSchool(53, 0, 1)
      .finalize();

    const result = await onboard(setUpRequest, client);

    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);

    expect(allSuccess).to.be.true;

    const resultSameBatch = await onboard(setUpRequest, client);

    // Ensure that all the errors are alreadyExistsError either from validation or admin service part
    const errors = resultSameBatch
      .getResponsesList()
      .filter((resp) => resp.getErrors());

    const errorAlreadyExists = resultSameBatch
      .getResponsesList()
      .filter((resp) => resp.getErrors())
      .filter((resp) => resp.getErrors().getEntityAlreadyExists());

    expect(errors.length).to.be.eql(errorAlreadyExists.length);

    expect(
      resultSameBatch
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getInternalServer())
    ).to.be.length(0);
  });
}).timeout(50000);

function addTeachersToClassReq(classId: string, teacherIds: ExternalUuid[]) {
  return new OnboardingRequest().setLinkEntities(
    new proto.Link().setAddUsersToClass(
      new AddUsersToClass()
        .setExternalClassUuid(classId)
        .setExternalTeacherUuidList(teacherIds)
    )
  );
}

function addStudentsToClassReq(classId: string, studentIds: ExternalUuid[]) {
  return new OnboardingRequest().setLinkEntities(
    new proto.Link().setAddUsersToClass(
      new AddUsersToClass()
        .setExternalClassUuid(classId)
        .setExternalStudentUuidList(studentIds)
    )
  );
}

async function assertSchoolUsersInAdmin(testCase: TestCaseBuilder) {
  for (const orgId of testCase.validOrgIds) {
    for (const schoolId of testCase.getValidSchools(orgId)) {
      const schoolUsers = await getSchoolUsers(schoolId);
      expect(schoolUsers.map((user) => user.externalUuid)).to.includes.members(
        testCase.getValidUsersInSchool(schoolId)
      );
    }
  }
}

function addProgramsToClassReq(classId: string, programNames: string[]) {
  return new OnboardingRequest().setLinkEntities(
    new proto.Link().setAddProgramsToClass(
      new AddProgramsToClass()
        .setExternalClassUuid(classId)
        .setProgramNamesList(programNames)
    )
  );
}
