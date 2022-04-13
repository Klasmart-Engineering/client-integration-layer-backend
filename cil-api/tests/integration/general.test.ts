import { v4 as uuidv4 } from 'uuid';

import { proto, protobufToEntity } from 'cil-lib';
import { expect } from 'chai';
import {
  getDbProgram,
  getDbRole,
  LOG_STUB,
  onboard,
  populateAdminService,
  wrapRequest,
} from '../util';
import { TestCaseBuilder } from '../util/testCases';
import {
  parseRequests,
  parseResponsesForErrorMessages,
  parseResponsesForSuccesses,
} from '../util/parseRequest';
import {
  createOrg as createOrgInAdminService,
  createProgramsAndRoles as createRolesAndProgramsInAdminService,
} from '../util/populateAdminService';
import {
  getSchool,
  getSchoolPrograms,
  getSchoolUsers,
  getSchoolClasses,
} from '../util/school';
import { getClass } from '../util/class';
import { getUser, getUserOrgRoles } from '../util/user';
import { IdNameMapper } from 'cil-lib/dist/main/lib/services/adminService';
import {
  AddOrganizationRolesToUser,
  AddUsersToOrganization,
  OnboardingRequest,
} from 'cil-lib/dist/main/lib/protos';
import { grpcTestContext, prismaTestContext } from '../setup';

describe('When receiving requests over the web the server should', () => {
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
}).timeout(50000);

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
