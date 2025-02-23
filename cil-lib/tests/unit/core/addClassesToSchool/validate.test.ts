import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  MachineError,
  OnboardingError,
  processOnboardingRequest,
} from '../../../../src';
import {
  Link,
  School as SchoolDB,
  Class as ClassDB,
} from '../../../../src/lib/database';
import {
  AddClassesToSchool,
  BatchOnboarding,
  Entity,
  Responses,
} from '../../../../src/lib/protos';
import { AdminService } from '../../../../src/lib/services';
import { Context } from '../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../util';

export type AddClassesToSchoolTestCase = {
  scenario: string;
  addClassesToSchool: AddClassesToSchool;
};

export const VALID_ADD_CLASSES_TO_SCHOOL: AddClassesToSchoolTestCase[] = [
  {
    scenario: 'is valid',
    addClassesToSchool: (() => {
      const addClasses = setUpAddClassesToSchool();
      return addClasses;
    })(),
  },
];

export const INVALID_ADD_CLASSES_TO_SCHOOL: AddClassesToSchoolTestCase[] = [
  {
    scenario: 'the external school uuid is invalid',
    addClassesToSchool: (() => {
      const addClasses = setUpAddClassesToSchool();
      addClasses.setExternalSchoolUuid('6aec2c48-aa45-464c-b3ee-59cd');
      return addClasses;
    })(),
  },
  {
    scenario: 'the external school uuid is empty',
    addClassesToSchool: (() => {
      const addClasses = setUpAddClassesToSchool();
      addClasses.setExternalSchoolUuid('');
      return addClasses;
    })(),
  },
  {
    scenario: 'class external uuid is invalid',
    addClassesToSchool: (() => {
      const addClasses = setUpAddClassesToSchool();
      addClasses.setExternalClassUuidsList(['6aec2c48-aa45-464c-b3ee-59cd']);
      return addClasses;
    })(),
  },
  {
    scenario: 'school uuid is not given',
    addClassesToSchool: (() => {
      const addClasses = setUpAddClassesToSchool(false, true);
      return addClasses;
    })(),
  },
  {
    scenario: 'classes list is missing',
    addClassesToSchool: (() => {
      const addClasses = setUpAddClassesToSchool(true, false);
      return addClasses;
    })(),
  },
  {
    scenario: 'class uuid is empty string',
    addClassesToSchool: (() => {
      const addClasses = setUpAddClassesToSchool();
      addClasses.setExternalClassUuidsList(['']);
      return addClasses;
    })(),
  },
  {
    scenario: 'class uuids has a malformed uuid in there',
    addClassesToSchool: (() => {
      const addClasses = setUpAddClassesToSchool();
      addClasses.setExternalClassUuidsList([
        uuidv4(),
        uuidv4(),
        '10d1dd28-a-beec-90475efd2b1b',
      ]);
      return addClasses;
    })(),
  },
  {
    scenario: 'class uuids has a random string in there',
    addClassesToSchool: (() => {
      const addClasses = setUpAddClassesToSchool();
      addClasses.setExternalClassUuidsList([uuidv4(), uuidv4(), 'hello world']);
      return addClasses;
    })(),
  },
];

describe('add classes to school should', () => {
  let schoolIdStub: SinonStub;
  let adminStub: SinonStub;
  let classDbStub: SinonStub;
  let classIdStub: SinonStub;
  let shareSameOrgStub: SinonStub;
  let linkStub: SinonStub;
  let contextStub: SinonStub;

  beforeEach(() => {
    const schoolId = uuidv4();
    const classId = uuidv4();
    adminStub = sinon.stub(AdminService, 'getInstance').resolves({
      addClassesToSchool: sinon
        .stub()
        .resolves([{ id: schoolId, name: 'Test school' }]),
    } as unknown as AdminService);
    shareSameOrgStub = sinon.stub(Link, 'shareTheSameOrganization').resolves();
    linkStub = sinon
      .stub(Link, 'classesBelongToSchools')
      .resolves({ valid: [], invalid: [uuidv4()] });

    classDbStub = sinon.stub().resolves({
      valid: new Map<string, string>([[uuidv4(), uuidv4()]]),
      invalid: [],
    });
    sinon.stub(ClassDB, 'linkToSchool').resolves();

    schoolIdStub = sinon.stub().resolves(schoolId);
    classIdStub = sinon.stub().resolves(classId);
    contextStub = sinon.stub(Context, 'getInstance').resolves({
      getSchoolId: schoolIdStub,
      getClassIds: classDbStub,
      getClassId: classIdStub,
    } as unknown as Context);
  });

  afterEach(() => {
    sinon.restore();
  });

  VALID_ADD_CLASSES_TO_SCHOOL.forEach(({ scenario, addClassesToSchool: c }) => {
    it(`pass when ${scenario}`, async () => {
      const req = wrapRequest(c);
      const resp = await processOnboardingRequest(req, LOG_STUB);
      const responses = resp.getResponsesList();

      expect(responses).to.have.length(1);
      expect(responses[0]).not.to.be.undefined;

      expect(responses[0].getSuccess()).to.be.true;
    });
  });

  INVALID_ADD_CLASSES_TO_SCHOOL.forEach(
    ({ scenario, addClassesToSchool: c }) => {
      it(`fail when ${scenario}`, async () => {
        const req = wrapRequest(c);
        const resp = await processOnboardingRequest(req, LOG_STUB);
        const responses = resp.getResponsesList();

        expect(responses).to.have.length.greaterThanOrEqual(1);
        for (const r of responses) {
          expect(r.getEntity()).to.not.be.undefined;
          expect(r.getEntityId()).to.not.be.undefined;
          expect(r.getSuccess()).to.be.false;
          expect(r.getErrors()?.hasValidation()).to.be.true;
        }
      });
    }
  );

  it('successfully process all valid ids when one is invalid', async () => {
    const innerReq = setUpAddClassesToSchool();
    const classIds = [uuidv4(), uuidv4(), uuidv4()];
    innerReq.setExternalClassUuidsList(classIds);
    const validExist = new Map<string, string>([
      [classIds[0], 'Test class 0'],
      [classIds[1], 'Test class 1'],
    ]);
    const invalidNotExist = [classIds[2]];
    classDbStub.resolves({
      valid: validExist,
      invalid: invalidNotExist,
    });
    linkStub.resolves({
      valid: [],
      invalid: validExist,
    });

    const req = wrapRequest(innerReq);
    const resp = await processOnboardingRequest(req, LOG_STUB);
    const responses = resp.getResponsesList();
    expect(responses).to.have.length(3);
    let successCount = 0;
    let failureCount = 0;
    for (const r of responses) {
      expect(r.getEntity()).not.to.be.undefined;
      expect(r.getEntityId()).not.to.be.undefined;
      if (r.getSuccess()) {
        successCount += 1;
      } else {
        failureCount += 1;
        expect(r.getErrors()?.hasEntityDoesNotExist()).to.be.true;
      }
    }
    expect(successCount).to.equal(2);
    expect(failureCount).to.equal(1);
  });
  it('should fail when adding a class and the class already belongs to school', async () => {
    const addClassesToSchool = setUpAddClassesToSchool();
    const classId = addClassesToSchool.getExternalClassUuidsList()[0];
    const req = wrapRequest(addClassesToSchool);

    linkStub.resolves({ valid: [classId], invalid: [] });
    const resp = await processOnboardingRequest(req, LOG_STUB);

    expect(resp.getResponsesList()[0].toObject().errors!.entityAlreadyExists)
      .not.to.be.undefined;
    expect(
      resp.getResponsesList()[0].toObject().errors!.entityAlreadyExists!
        .detailsList
    ).to.includes.members([`Class: ${classId} already belongs to school`]);
  });

  it('if one class belongs to the school, but others dont, it should fail that class and pass the others', async () => {
    const addClasses = setUpAddClassesToSchool();
    const class1 = uuidv4();
    const class2 = uuidv4();
    const class3 = uuidv4();
    addClasses.setExternalClassUuidsList([class1, class2, class3]);

    const req = wrapRequest(addClasses);
    classDbStub.onFirstCall().resolves({
      valid: new Map<string, string>([
        [uuidv4(), uuidv4()],
        [uuidv4(), uuidv4()],
        [uuidv4(), uuidv4()],
      ]),
      invalid: [],
    });
    classDbStub.onSecondCall().resolves({
      valid: new Map<string, string>([
        [uuidv4(), uuidv4()],
        [uuidv4(), uuidv4()],
      ]),
      invalid: [],
    });
    contextStub.resolves({
      getSchoolId: schoolIdStub,
      getClassIds: classDbStub,
      getClassId: classIdStub,
    } as unknown as Context);
    linkStub.resolves({ valid: [class2], invalid: [class1, class3] });

    const resp = await processOnboardingRequest(req, LOG_STUB);
    expect(resp).not.to.be.undefined;
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(3);

    // Test valid responses are correct
    const validResponse = responses[1];
    expect(validResponse).not.to.be.undefined;
    expect(validResponse.success).to.be.true;

    // Test invalid response is correct
    const invalidResponse = responses[0];
    expect(invalidResponse.success).to.be.false;
    expect(invalidResponse.requestId).to.eql(
      req.getRequestsList()[0].getRequestId()?.toObject()
    );
    expect(invalidResponse.entityId).to.contains(class2);
    expect(invalidResponse.entity).to.equal(Entity.CLASS);
    expect(invalidResponse.errors?.entityAlreadyExists).not.to.be.undefined;
    expect(
      invalidResponse.errors?.entityAlreadyExists?.detailsList
    ).to.includes.members([`Class: ${class2} already belongs to school`]);
  });

  it('successfully process all valid ids when one is invalid (non-existing) and one invalid (already linked)', async () => {
    const innerReq = setUpAddClassesToSchool();
    const classIds = [uuidv4(), uuidv4(), uuidv4()];
    innerReq.setExternalClassUuidsList(classIds);
    const validExist = [classIds[0], classIds[1]];
    const invalidNotExist = [classIds[2]];
    const validNotLinked = [classIds[0]];
    const invalidAlreadyLinked = [classIds[2]];
    classDbStub.resolves({
      valid: validExist,
      invalid: invalidNotExist,
    });
    linkStub.resolves({
      valid: validNotLinked,
      invalid: invalidAlreadyLinked,
    });

    const req = wrapRequest(innerReq);
    const resp = await processOnboardingRequest(req, LOG_STUB);
    const responses = resp.getResponsesList();
    expect(responses).to.have.length(3);

    let successCount = 0;
    let failureCount = 0;
    let alreadyLinked = 0;
    let doesNotExist = 0;
    for (const r of responses) {
      expect(r.getEntity()).not.to.be.undefined;
      expect(r.getEntityId()).not.to.be.undefined;
      if (r.getSuccess()) {
        successCount += 1;
      } else {
        failureCount += 1;
        if (r.getErrors()?.hasEntityAlreadyExists()) {
          alreadyLinked += 1;
        }
        if (r.getErrors()?.hasEntityDoesNotExist()) {
          doesNotExist += 1;
        }
      }
    }
    expect(successCount).to.equal(1);
    expect(failureCount).to.equal(2);
    expect(alreadyLinked).to.equal(1);
    expect(doesNotExist).to.equal(1);
  });

  it(`fail when the entities don't belong to the same organization`, async () => {
    shareSameOrgStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Not in same org',
        Category.REQUEST,
        LOG_STUB
      )
    );

    const innerReq = setUpAddClassesToSchool();
    const req = wrapRequest(innerReq);
    await makeCommonAssertions(req);
  });
});

async function makeCommonAssertions(
  req: BatchOnboarding,
  expectedMessage?: string
): Promise<Responses> {
  try {
    const resp = await processOnboardingRequest(req, LOG_STUB);
    expect(resp).not.to.be.undefined;
    const responses = resp.toObject().responsesList;
    expect(responses).to.have.lengthOf(1);
    const response = responses[0];
    expect(response.success).to.be.false;
    expect(response.requestId).to.eql(
      req.getRequestsList()[0].getRequestId()?.toObject()
    );
    expect(response.entity).to.equal(Entity.CLASS);
    expect(response.errors?.validation).not.to.be.undefined;
    return resp;
  } catch (error) {
    expect(error, 'this api should not error').to.be.undefined;
  }
  throw new Error('Unexpected reached the end of the test');
}

function setUpAddClassesToSchool(
  schoolId = true,
  classIds = true
): AddClassesToSchool {
  const addClassesToSchool = new AddClassesToSchool();
  if (schoolId) addClassesToSchool.setExternalSchoolUuid(uuidv4());
  if (classIds) addClassesToSchool.setExternalClassUuidsList([uuidv4()]);
  return addClassesToSchool;
}
