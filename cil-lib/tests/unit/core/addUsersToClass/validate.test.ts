import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  MachineError,
  OnboardingError,
  processOnboardingRequest,
} from '../../../../src';
import { Class as ClassDB, Link as LinkDB } from '../../../../src/lib/database';
import {
  AddUsersToClass,
  BatchOnboarding,
  Entity,
  Response,
  Responses,
} from '../../../../src/lib/protos';
import { AdminService } from '../../../../src/lib/services';
import { Context } from '../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../util';

export type AddUsersToClassTestCase = {
  scenario: string;
  addUsersToClass: AddUsersToClass;
  message?: string;
};

export const VALID_ADD_USERS_TO_CLASS: AddUsersToClassTestCase[] = [
  {
    scenario: 'valid',
    addUsersToClass: setUpAddUsersToClass(),
  },
];

export const INVALID_ADD_USERS_TO_CLASS: AddUsersToClassTestCase[] = [
  {
    scenario: 'the class uuid is empty',
    addUsersToClass: setUpAddUsersToClass(false, true, true),
    message: '"externalClassUuid" is not allowed to be empty'
  },
];

describe('add users to class validation', () => {
  let linkStub: SinonStub;
  let classStub: SinonStub;
  let adminStub: SinonStub;
  let classIdStub: SinonStub;
  let userIdsStub: SinonStub;

  beforeEach(() => {
    process.env.ADMIN_SERVICE_API_KEY = uuidv4();
    adminStub = sinon.stub(AdminService, 'getInstance').resolves({
      addStudentsToClasses: sinon
        .stub()
        .resolves([{ id: uuidv4(), name: 'Test class' }]),
      addTeachersToClasses: sinon
        .stub()
        .resolves([{ id: uuidv4(), name: 'Test class' }]),
    } as unknown as AdminService);
    const s = new Set<string>();
    s.add(uuidv4());
    classStub = sinon.stub(ClassDB, 'getExternalSchoolIds').resolves(s);
    linkStub = sinon
      .stub(LinkDB, 'usersBelongToSchool')
      .resolves({ valid: [uuidv4()], invalid: [] });
    classIdStub = sinon.stub().resolves(uuidv4());
    userIdsStub = sinon.stub().resolves({ valid: new Map(), invalid: [] });
    sinon.stub(Context, 'getInstance').resolves({
      getClassId: classIdStub,
      getUserIds: userIdsStub,
    } as unknown as Context);
  });

  afterEach(() => {
    sinon.restore();
  });

  VALID_ADD_USERS_TO_CLASS.forEach(({ scenario, addUsersToClass }) => {
    it(`should pass when add users to class is ${scenario}`, async () => {
      const studentExternalId = addUsersToClass.getExternalStudentUuidList()[0];
      const teacherExternalId = addUsersToClass.getExternalTeacherUuidList()[0];
      userIdsStub.resolves({
        valid: new Map([
          [studentExternalId, uuidv4()],
          [teacherExternalId, uuidv4()],
        ]),
        invalid: [],
      });
      linkStub
        .onFirstCall()
        .resolves({ valid: [studentExternalId], invalid: [] });
      linkStub
        .onSecondCall()
        .resolves({ valid: [teacherExternalId], invalid: [] });
      const req = wrapRequest(addUsersToClass);
      const resp = await processOnboardingRequest(req, LOG_STUB);
      const responses = resp.getResponsesList();
      expect(responses).to.have.length(2);
      assertValid(responses[0], studentExternalId);
      assertValid(responses[1], teacherExternalId);
    });
  });

  it('should pass when when only students are passed in', async () => {
    const addUsersToClass = setUpAddUsersToClass(true, true, false);
    const studentExternalId = addUsersToClass.getExternalStudentUuidList()[0];
    userIdsStub.resolves({
      valid: new Map([
        [studentExternalId, uuidv4()],
      ]),
      invalid: [],
    });
    linkStub
      .onFirstCall()
      .resolves({ valid: [studentExternalId], invalid: [] });
    linkStub
      .onSecondCall()
      .resolves({ valid: [], invalid: [] });
    const req = wrapRequest(addUsersToClass);
    const resp = await processOnboardingRequest(req, LOG_STUB);
    const responses = resp.getResponsesList();
    expect(responses).to.have.length(1);
    assertValid(responses[0], studentExternalId);
  })

  it('should pass when when only teachers are passed in', async () => {
    const addUsersToClass = setUpAddUsersToClass(true, false, true);
    const teacherExternalId = addUsersToClass.getExternalTeacherUuidList()[0];
    userIdsStub.resolves({
      valid: new Map([
        [teacherExternalId, uuidv4()],
      ]),
      invalid: [],
    });
    linkStub
      .onFirstCall()
      .resolves({ valid: [], invalid: [] });
    linkStub
      .onSecondCall()
      .resolves({ valid: [teacherExternalId], invalid: [] });
    const req = wrapRequest(addUsersToClass);
    const resp = await processOnboardingRequest(req, LOG_STUB);
    const responses = resp.getResponsesList();
    expect(responses).to.have.length(1);
    assertValid(responses[0], teacherExternalId);
  })

  INVALID_ADD_USERS_TO_CLASS.forEach(({ scenario, addUsersToClass, message }) => {
    it(`fail when ${scenario}`, async () => {
      const req = wrapRequest(addUsersToClass);
      const resp = await makeCommonAssertions(req, message);
      const response = resp.toObject().responsesList[0];
      expect(response.errors?.validation).not.to.be.undefined;
    });
  });

  it('should fail if the link does not exist', async () => {
    const req = wrapRequest(VALID_ADD_USERS_TO_CLASS[0].addUsersToClass);
    linkStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['Invalid Link']
      )
    );
    await makeCommonAssertions(req, 'Invalid Link');
  });

  it('should fail if the class ID is not in the database', async () => {
    const req = wrapRequest(VALID_ADD_USERS_TO_CLASS[0].addUsersToClass);
    classStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['Invalid Class']
      )
    );
    await makeCommonAssertions(req, 'Invalid Class');
  });
});

function setUpAddUsersToClass(
  classId = true,
  students = true,
  teachers = true
): AddUsersToClass {
  const addUsersToClass = new AddUsersToClass();
  if (classId) addUsersToClass.setExternalClassUuid(uuidv4());
  if (students) addUsersToClass.setExternalStudentUuidList([uuidv4()]);
  if (teachers) addUsersToClass.setExternalTeacherUuidList([uuidv4()]);
  return addUsersToClass;
}

async function makeCommonAssertions(
  req: BatchOnboarding,
  expectedMessage?: string
): Promise<Responses> {
  try {
    const resp = await processOnboardingRequest(req, LOG_STUB);
    expect(resp).not.to.be.undefined;
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(2);
    const addUsers = req
      .getRequestsList()[0]
      .getLinkEntities()!
      .getAddUsersToClass();
    assertValidationError(
      responses[0],
      addUsers!.getExternalStudentUuidList()[0],
      req,
      expectedMessage
    );
    assertValidationError(
      responses[1],
      addUsers!.getExternalTeacherUuidList()[0],
      req,
      expectedMessage
    );
    return resp;
  } catch (error) {
    expect(error, 'this api should not error').to.be.undefined;
  }
  throw new Error('Unexpected reached the end of the test');
}

function assertValidationError(
  response: Response.AsObject,
  expectedEntityId: string,
  req: BatchOnboarding,
  expectedMessage?: string
) {
  expect(response.success).to.be.false;
  expect(response.requestId).to.eql(
    req.getRequestsList()[0].getRequestId()?.toObject()
  );
  expect(response.entityId).to.equal(expectedEntityId);
  expect(response.entity).to.equal(Entity.USER);
  expect(response.errors?.validation).not.to.be.undefined;
  if (expectedMessage) {
    expect(response.errors?.validation?.errorsList[0].detailsList).to.include(
      expectedMessage
    );
  }
}

function assertValid(response: Response, expectedEntityId: string) {
  expect(response).not.to.be.undefined;
  expect(response.getSuccess()).to.be.true;
  expect(response.getEntityId()).to.equal(expectedEntityId);
}
