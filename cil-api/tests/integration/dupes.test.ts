import { v4 as uuidv4 } from 'uuid';

import { proto, ExternalUuid } from 'cil-lib';
import { expect } from 'chai';
import { onboard, populateAdminService, wrapRequest } from '../util';
import { TestCaseBuilder } from '../util/testCases';
import { getClassProgramsConnections } from '../util/class';
import { deleteUsers, setUpUser, getUser } from '../util/user';
import { IdNameMapper } from 'cil-lib/dist/main/lib/services/adminService';
import {
  AddClassesToSchool,
  AddProgramsToClass,
  AddUsersToClass,
  AddUsersToOrganization,
  AddUsersToSchool,
  OnboardingRequest,
} from 'cil-lib/dist/main/lib/protos';
import { getClassConnections } from '../util/class';
import { requestAndResponseIdsMatch } from '../util/parseRequest';

describe('When receiving requests over the web the server should', () => {
  it('fail the users onboarding if 5 users are valid and 5 are invalid', async () => {
    const res = await populateAdminService();
    let builder = new TestCaseBuilder()
      .addValidOrgs(res)
      .addValidSchoolsToEachOrg(5)
      .addValidClassesToEachSchool(8)
      .addValidUsersToEachSchool(5);

    for (let i = 0; i < 5; i++) {
      builder = builder.addCustomizableUser(
        { email: '', phone: '', username: '' },
        false
      );
    }
    const reqs = builder.finalize();
    const result = await onboard(reqs, global.client);
    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(allSuccess).to.be.false;
    // "Users: [id] do not belong to the same parent school as the class [id]. When attempting to add users to a class they must share the same parent school"

    expect(requestAndResponseIdsMatch(reqs, result)).to.be.true;
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
    const setUp = await onboard(reqs, global.client);
    const allSuccess = setUp
      .toObject()
      .responsesList.every((response) => response.success === true);
    expect(allSuccess).to.be.true;

    const request = wrapRequest([
      new OnboardingRequest().setLinkEntities(
        new proto.Link().setAddUsersToClass(
          new AddUsersToClass()
            .setExternalClassUuid(classId)
            .setExternalTeacherUuidList([teacherId1, teacherId2, teacherId3])
            .setExternalStudentUuidList([studentId1, studentId2])
        )
      ),
    ]);

    const result = await onboard(request, global.client);

    expect(
      result.toObject().responsesList.filter((resp) => resp.success === true)
    ).to.be.length(2);
    expect(
      result.toObject().responsesList.filter((resp) => resp.success === false)
    ).to.be.length(3);
    expect(
      result.toObject().responsesList.filter((r) => r.errors)
    ).to.be.length(3);
    expect(
      result
        .toObject()
        .responsesList.filter((resp) => resp.errors)
        .filter((resp) => resp.errors.entityAlreadyExists)
    ).to.be.length(3);
    expect(
      result.toObject().responsesList.map((resp) => resp.entityId)
    ).to.includes.members([
      teacherId1,
      teacherId2,
      teacherId3,
      studentId1,
      studentId2,
    ]);

    expect(requestAndResponseIdsMatch(request, result)).to.be.true;

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
    const setUp = await onboard(reqs, global.client);
    const allSuccess = setUp
      .toObject()
      .responsesList.every((response) => response.success === true);
    expect(allSuccess).to.be.true;

    const request = wrapRequest([
      new OnboardingRequest().setLinkEntities(
        new proto.Link().setAddUsersToClass(
          new AddUsersToClass()
            .setExternalClassUuid(classId)
            .setExternalTeacherUuidList([teacherId1, teacherId2])
            .setExternalStudentUuidList([studentId1, studentId2])
        )
      ),
    ]);

    const result = await onboard(request, global.client);

    expect(
      result.toObject().responsesList.filter((resp) => resp.success === false)
    ).to.be.length(4);
    expect(
      result.toObject().responsesList.filter((r) => r.errors)
    ).to.be.length(4);
    expect(
      result
        .toObject()
        .responsesList.filter((resp) => resp.errors)
        .filter((resp) => resp.errors.entityAlreadyExists)
    ).to.be.length(4);
    expect(
      result.toObject().responsesList.map((resp) => resp.entityId)
    ).to.includes.members([teacherId1, teacherId2, studentId1, studentId2]);

    expect(requestAndResponseIdsMatch(request, result)).to.be.true;

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
      await onboard(setUpRequest, global.client)
    ).getResponsesList();
    expect(setUpResult.every((response) => response.getSuccess() === true)).to
      .be.true;
    expect(setUpResult.map((result) => result.getEntityId())).includes.members([
      teacherId1,
      teacherId2,
      teacherId3,
      classId,
    ]);

    const request = wrapRequest([
      addTeachersToClassReq(classId, [teacherId1]),
      addTeachersToClassReq(classId, [teacherId2, teacherId3]),
    ]);
    const result = await onboard(request, global.client);

    expect(result.getResponsesList()).to.be.length(3);
    expect(
      result.getResponsesList().filter((resp) => resp.getSuccess() === true)
    ).to.be.length(1);
    expect(
      result.getResponsesList().filter((resp) => resp.getErrors())
    ).to.be.length(2);

    expect(
      result
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getEntityAlreadyExists())
    ).to.be.length(2);
    expect(
      result.getResponsesList().map((resp) => resp.getEntityId())
    ).to.includes.members([teacherId1, teacherId2, teacherId3]);

    expect(requestAndResponseIdsMatch(request, result)).to.be.true;

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
      await onboard(setUpRequest, global.client)
    ).getResponsesList();
    expect(setUpResult.every((response) => response.getSuccess() === true)).to
      .be.true;
    expect(setUpResult.map((result) => result.getEntityId())).includes.members([
      student1,
      student2,
      student3,
      classId,
    ]);

    const request = wrapRequest([
      addStudentsToClassReq(classId, [student1]),
      addStudentsToClassReq(classId, [student2, student3]),
    ]);
    const result = await onboard(request, global.client);

    expect(result.getResponsesList()).to.be.length(3);
    expect(
      result.getResponsesList().filter((resp) => resp.getSuccess() === true)
    ).to.be.length(1);
    expect(
      result.getResponsesList().filter((resp) => resp.getErrors())
    ).to.be.length(2);

    expect(
      result
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getEntityAlreadyExists())
    ).to.be.length(2);
    expect(
      result.getResponsesList().map((resp) => resp.getEntityId())
    ).to.includes.members([student1, student2, student3]);

    expect(requestAndResponseIdsMatch(request, result)).to.be.true;

    const classConnections = await getClassConnections(classId);
    expect(
      classConnections.students.map((student) => student.externalUuid)
    ).to.includes.members([student1, student2, student3]);
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

    const setUpResult = await onboard(setUpReqs, global.client);
    const setUpSuccess = setUpResult
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(setUpSuccess).to.be.true;
    expect(
      setUpResult.getResponsesList().map((result) => result.getEntityId())
    ).includes.members([classId1, classId2, schoolId]);
    const request = wrapRequest([
      addProgramsToClassReq(classId1, ['TEST PROGRAM 1']),
      addProgramsToClassReq(classId1, ['TEST PROGRAM 2']),
      addProgramsToClassReq(classId2, ['TEST PROGRAM 3']),
    ]);
    const result = await onboard(request, global.client);

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

    expect(requestAndResponseIdsMatch(request, result)).to.be.true;

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

    const setUpResult = await onboard(setUpReqs, global.client);
    const setUpSuccess = setUpResult
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(setUpSuccess).to.be.true;
    expect(
      setUpResult.getResponsesList().map((result) => result.getEntityId())
    ).includes.members([classId1, classId2, schoolId]);

    const request = wrapRequest([
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
    ]);
    const result = await onboard(request, global.client);

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

    expect(requestAndResponseIdsMatch(request, result)).to.be.true;

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

  it('partially succeed when trying to add classes to the same schoolId1 and schoolId2', async () => {
    const res = await populateAdminService();
    const org = res.keys().next().value;
    const schoolId1 = uuidv4();
    const schoolId2 = uuidv4();
    const classId1 = uuidv4();
    const classId2 = uuidv4();
    const classId3 = uuidv4();
    const classId4 = uuidv4();

    const setUpReqs = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool(
        {
          externalUuid: schoolId1,
          externalOrganizationUuid: org.id,
        },
        true
      )
      .addSchool(
        {
          externalUuid: schoolId2,
          externalOrganizationUuid: org.id,
        },
        true
      )
      .addClass(
        {
          externalUuid: classId1,
          externalSchoolUuid: schoolId1,
          externalOrganizationUuid: org.id,
        },
        true,
        false
      )
      .addClass(
        {
          externalUuid: classId2,
          externalSchoolUuid: schoolId1,
          externalOrganizationUuid: org.id,
        },
        true,
        false
      )
      .addClass(
        {
          externalUuid: classId3,
          externalSchoolUuid: schoolId2,
          externalOrganizationUuid: org.id,
        },
        true,
        false
      )

      .finalize();

    const setUpResult = await onboard(setUpReqs, global.client);
    const setUpSuccess = setUpResult
      .toObject()
      .responsesList.every((r) => r.success === true);
    expect(setUpSuccess).to.be.true;
    expect(
      setUpResult.getResponsesList().map((result) => result.getEntityId())
    ).includes.members([classId1, classId2, classId3, schoolId1, schoolId2]);

    const request = wrapRequest([
      addClassesToSchoolReq(schoolId1, [classId1, classId2]),
      addClassesToSchoolReq(schoolId1, [classId2, classId3]),
      addClassesToSchoolReq(schoolId1, [classId1]),
      addClassesToSchoolReq(schoolId2, [classId1, classId2]),
      addClassesToSchoolReq(schoolId2, [classId3]),
      addClassesToSchoolReq(schoolId2, [classId3, classId4]),
    ]);
    const result = await onboard(request, global.client);

    expect(result.getResponsesList()).to.be.length(10);
    expect(
      result.getResponsesList().filter((r) => r.getSuccess() === true)
    ).to.be.length(0);
    expect(result.getResponsesList().filter((r) => r.getErrors())).to.be.length(
      10
    );
    expect(
      result
        .getResponsesList()
        .filter((r) => r.getErrors())
        .filter((r) => r.getErrors().getEntityAlreadyExists())
    ).to.be.length(9);

    expect(
      result
        .getResponsesList()
        .filter((r) => r.getErrors())
        .filter((r) => r.getErrors().getEntityDoesNotExist())
    ).to.be.length(1);

    expect(
      result
        .getResponsesList()
        .filter((r) => r.getErrors())
        .filter((r) => r.getErrors().getEntityAlreadyExists())
        .filter((r) => r.getEntityId() === classId1)
    ).to.be.length(3);

    expect(
      result
        .getResponsesList()
        .filter((r) => r.getErrors())
        .filter((r) => r.getErrors().getEntityAlreadyExists())
        .filter((r) => r.getEntityId() === classId2)
    ).to.be.length(3);

    expect(
      result
        .getResponsesList()
        .filter((r) => r.getErrors())
        .filter((r) => r.getErrors().getEntityAlreadyExists())
        .filter((r) => r.getEntityId() === classId3)
    ).to.be.length(3);

    expect(
      result
        .getResponsesList()
        .filter((r) => r.getErrors())
        .filter((r) => r.getErrors().getEntityDoesNotExist())
        .filter((r) => r.getEntityId() === classId4)
    ).to.be.length(1);

    expect(requestAndResponseIdsMatch(request, result)).to.be.true;
  }).timeout(50000);

  it('handle user with same fields but with different external uuid in same request', async () => {
    const res = await populateAdminService();
    const org = res.keys().next().value;

    const setUpResponse = await onboard(
      wrapRequest([
        new proto.OnboardingRequest().setOrganization(
          new proto.Organization().setExternalUuid(org.id).setName(org.name)
        ),
      ]),
      global.client
    );

    expect(
      setUpResponse.toObject().responsesList.every((r) => r.success === true)
    ).to.be.true;

    const user = setUpUser(org.id);
    const dupeUser = cloneUser(user).setExternalUuid(uuidv4());
    const request = wrapRequest([
      new proto.OnboardingRequest().setUser(user),
      new proto.OnboardingRequest().setUser(dupeUser),
      new proto.OnboardingRequest().setLinkEntities(
        new proto.Link().setAddUsersToOrganization(
          new AddUsersToOrganization()
            .setExternalOrganizationUuid(org.id)
            .setExternalUserUuidsList([
              user.getExternalUuid(),
              dupeUser.getExternalUuid(),
            ])
            .setRoleIdentifiersList(['TEST ROLE 1'])
        )
      ),
    ]);
    const result = await onboard(request, global.client);

    expect(result.toObject().responsesList).to.be.length(4);
    expect(
      result.toObject().responsesList.filter((r) => r.success === true)
    ).to.be.length(2);
    expect(
      result.toObject().responsesList.filter((r) => r.errors)
    ).to.be.length(2);
    expect(
      result
        .toObject()
        .responsesList.filter((r) => r.errors)
        .filter((r) => r.errors.validation)
    ).to.be.length(1);
    expect(
      result.toObject().responsesList.map((resp) => resp.entityId)
    ).to.includes.members([user.getExternalUuid(), dupeUser.getExternalUuid()]);

    expect(requestAndResponseIdsMatch(request, result)).to.be.true;

    const userInAdmin = await getUser(user.getExternalUuid());
    expect(userInAdmin.externalOrgIds).to.include.members([org.id]);
    const dupe = await getUser(dupeUser.getExternalUuid());
    expect(dupe).to.be.undefined;
  }).timeout(50000);

  it('handle onboarding users which already exists and a new user in the system', async () => {
    const res = await populateAdminService();
    const org = res.keys().next().value;

    const user1 = setUpUser(org.id);
    user1.setEmail('');
    user1.setPhone('');
    const user2 = setUpUser(org.id);
    user2.setUsername('');
    user2.setPhone('');
    const user3 = setUpUser(org.id);
    user3.setUsername('');
    user3.setEmail('');
    const user4 = setUpUser(org.id);
    const result = await (
      await onboard(
        wrapRequest([
          new proto.OnboardingRequest().setOrganization(
            new proto.Organization().setExternalUuid(org.id).setName(org.name)
          ),
          new proto.OnboardingRequest().setUser(user1),
          new proto.OnboardingRequest().setUser(user2),
          new proto.OnboardingRequest().setUser(user3),
          new proto.OnboardingRequest().setUser(user4),
        ]),
        global.client
      )
    ).toObject().responsesList;
    const allSuccess = result.every((r) => r.success === true);
    expect(allSuccess).to.be.true;

    await deleteUsers([
      user1.getExternalUuid(),
      user2.getExternalUuid(),
      user3.getExternalUuid(),
      user4.getExternalUuid(),
    ]);

    const user5 = setUpUser(org.id);

    const dupeReq = wrapRequest([
      new proto.OnboardingRequest().setUser(user1),
      new proto.OnboardingRequest().setUser(user2),
      new proto.OnboardingRequest().setUser(user3),
      new proto.OnboardingRequest().setUser(user4),
      new proto.OnboardingRequest().setUser(user5),
    ]);
    const response = await onboard(dupeReq, global.client);

    expect(response.toObject().responsesList).to.be.length(5);
    expect(
      response.toObject().responsesList.filter((resp) => resp.success === true)
    ).to.be.length(1);
    expect(
      response.toObject().responsesList.filter((resp) => resp.success === false)
    ).to.be.length(4);
    expect(
      response.toObject().responsesList.filter((r) => r.errors)
    ).to.be.length(4);
    expect(
      response
        .toObject()
        .responsesList.filter((resp) => resp.errors)
        .filter((resp) => resp.errors.entityAlreadyExists)
    ).to.be.length(4);
    expect(
      response.toObject().responsesList.map((resp) => resp.entityId)
    ).to.includes.members([
      user1.getExternalUuid(),
      user2.getExternalUuid(),
      user3.getExternalUuid(),
      user4.getExternalUuid(),
      user5.getExternalUuid(),
    ]);

    expect(requestAndResponseIdsMatch(dupeReq, response)).to.be.true;
  }).timeout(50000);

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

    const result = await onboard(setUpRequest, global.client);

    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);

    expect(allSuccess).to.be.true;

    const resultSameBatch = await onboard(setUpRequest, global.client);

    // Ensure that all the errors are alreadyExistsError either from validation or admin service part
    const errors = resultSameBatch
      .getResponsesList()
      .filter((resp) => resp.getErrors());

    const errorsAlreadyExists = resultSameBatch
      .getResponsesList()
      .filter((resp) => resp.getErrors())
      .filter((resp) => resp.getErrors().getEntityAlreadyExists());

    expect(errors.length).to.be.eql(errorsAlreadyExists.length);

    expect(
      resultSameBatch
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getInternalServer())
    ).to.be.length(0);

    // You have only one success response when you onboard the same batch and it's coming from the organization
    expect(
      resultSameBatch
        .getResponsesList()
        .filter((resp) => resp.getSuccess() === true)
    ).to.be.length(1);

    expect(
      resultSameBatch
        .getResponsesList()
        .filter((resp) => resp.getSuccess() === true)
        .filter((resp) => resp.getEntity() === proto.Entity.ORGANIZATION)
        .filter((resp) => resp.getEntityId() === org.id)
    ).to.be.length(1);

    expect(requestAndResponseIdsMatch(setUpRequest, resultSameBatch)).to.be
      .true;
  });

  it('handling the dupe entries in validation part when trying to link users to school', async () => {
    const res = await populateAdminService();
    const org: IdNameMapper = res.keys().next().value;
    const schoolId = uuidv4();
    const userId1 = uuidv4();
    const userId2 = uuidv4();

    const setUpRequest = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool({ externalUuid: schoolId, externalOrganizationUuid: org.id })
      .addUser({
        addToValidSchools: 1,
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: userId1,
      })
      .addUser({
        addToValidSchools: 1,
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: userId2,
      })
      .finalize();

    const result = await onboard(setUpRequest, global.client);

    const allSuccess = result
      .toObject()
      .responsesList.every((r) => r.success === true);

    expect(allSuccess).to.be.true;

    const resultSameUsers = await onboard(setUpRequest, global.client);

    // You have only one success response when you onboard the same batch and it's coming from the organization
    expect(
      resultSameUsers
        .getResponsesList()
        .filter((resp) => resp.getSuccess() === true)
    ).to.be.length(1);

    expect(
      resultSameUsers
        .getResponsesList()
        .filter((resp) => resp.getSuccess() === true)
        .filter((resp) => resp.getEntity() === proto.Entity.ORGANIZATION)
        .filter((resp) => resp.getEntityId() === org.id)
    ).to.be.length(1);

    expect(
      resultSameUsers
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getEntityAlreadyExists())
    ).to.be.length(11);

    expect(requestAndResponseIdsMatch(setUpRequest, resultSameUsers)).to.be
      .true;
  });

  it('handling different scenarios in the validation part for linking users to school and prepare the corresponding responses', async () => {
    const res = await populateAdminService();
    const org: IdNameMapper = res.keys().next().value;
    const schoolId = uuidv4();
    const userId1 = uuidv4();
    const userId2 = uuidv4();
    const userId3 = uuidv4();
    const userId4 = uuidv4();

    const setUpRequest = new TestCaseBuilder()
      .addValidOrgs(res)
      .addSchool({ externalUuid: schoolId, externalOrganizationUuid: org.id })
      .addUser({
        addToValidSchools: 1,
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: userId1,
      })
      .addUser({
        addToValidSchools: 1,
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: userId2,
      })
      .addUser({
        addToValidSchools: 0,
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: userId3,
      })
      .addUser({
        addToValidSchools: 0,
        addToValidClasses: 0,
        externalOrganizationUuid: org.id,
        externalUuid: userId4,
      })
      .finalize();

    const setUpResponses = await onboard(setUpRequest, global.client);

    const allSuccess = setUpResponses
      .toObject()
      .responsesList.every((r) => r.success === true);

    expect(allSuccess).to.be.true;

    const request = wrapRequest([
      addUsersToSchoolReq(schoolId, [uuidv4(), userId1]),
      addUsersToSchoolReq(uuidv4(), [userId2, userId1]),
      addUsersToSchoolReq(uuidv4(), []),
      addUsersToSchoolReq(schoolId, [userId3, uuidv4(), userId2]),
      addUsersToSchoolReq(schoolId, [userId4, userId2]),
    ]);
    const result = await onboard(request, global.client);

    expect(
      result.getResponsesList().filter((resp) => resp.getSuccess() === true)
    ).to.be.length(2);

    expect(
      result
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getEntityAlreadyExists())
    ).to.be.length(3);

    expect(
      result
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getEntityDoesNotExist())
    ).to.be.length(2);

    expect(
      result
        .getResponsesList()
        .filter((resp) => resp.getErrors())
        .filter((resp) => resp.getErrors().getValidation()) // school doesn't exist
    ).to.be.length(3);

    expect(requestAndResponseIdsMatch(request, result)).to.be.true;
  });
}).timeout(50000);

function cloneUser(user: proto.User): proto.User {
  const clonedUser = new proto.User()
    .setExternalUuid(user.getExternalUuid())
    .setExternalOrganizationUuid(user.getExternalOrganizationUuid())
    .setEmail(user.getEmail())
    .setPhone(user.getPhone())
    .setUsername(user.getUsername())
    .setGivenName(user.getGivenName())
    .setFamilyName(user.getFamilyName())
    .setGender(user.getGender())
    .setDateOfBirth(user.getDateOfBirth());

  clonedUser.setRoleIdentifiersList(user.getRoleIdentifiersList());

  return clonedUser;
}

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

function addProgramsToClassReq(classId: string, programNames: string[]) {
  return new OnboardingRequest().setLinkEntities(
    new proto.Link().setAddProgramsToClass(
      new AddProgramsToClass()
        .setExternalClassUuid(classId)
        .setProgramNamesList(programNames)
    )
  );
}

function addClassesToSchoolReq(schoolId: string, classIds: string[]) {
  return new OnboardingRequest().setLinkEntities(
    new proto.Link().setAddClassesToSchool(
      new AddClassesToSchool()
        .setExternalSchoolUuid(schoolId)
        .setExternalClassUuidsList(classIds)
    )
  );
}

function addUsersToSchoolReq(schoolId: string, userIds: ExternalUuid[]) {
  return new OnboardingRequest().setLinkEntities(
    new proto.Link().setAddUsersToSchool(
      new AddUsersToSchool()
        .setExternalSchoolUuid(schoolId)
        .setExternalUserUuidsList(userIds)
    )
  );
}
