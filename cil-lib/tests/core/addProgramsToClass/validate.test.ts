import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  MachineError,
  OnboardingError,
  processOnboardingRequest,
} from '../../../src';
import { Class as ClassDB, School as SchoolDB } from '../../../src/lib/database';
import {
  BatchOnboarding,
  AddProgramsToClass,
  Entity,
  Responses,
} from '../../../src/lib/protos';
import { AdminService } from '../../../src/lib/services';
import { Context } from '../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../util';

export type AddProgramsToClassTestCase = {
  scenario: string;
  addProgramsToClass: AddProgramsToClass;
  message?: string; 
};

export const VALID_ADD_PROGRAMS_TO_CLASS: AddProgramsToClassTestCase[] = [
  {
    scenario: 'valid',
    addProgramsToClass: setUpAddProgramsToClass(),
  },
];

export const INVALID_ADD_PROGRAMS_TO_CLASS: AddProgramsToClassTestCase[] = [
  {
    scenario: 'the external organization uuid is invalid',
    addProgramsToClass: (() => {
      const addPrograms = setUpAddProgramsToClass();
      addPrograms.setExternalOrganizationUuid('6aec2c48-aa45-464c-b3ee-59cd');
      return addPrograms;
    })(),
    message: '"externalOrganizationUuid" must be a valid GUID'
  },
  {
    scenario: 'the program names are empty',
    addProgramsToClass: (() => {
      const addPrograms = setUpAddProgramsToClass();
      addPrograms.setProgramNamesList([]);
      return addPrograms;
    })(),
    message: '"programNamesList" must contain at least 1 items'
  },
  {
    scenario: 'the program name is less than the minimum character limit',
    addProgramsToClass: (() => {
      const addPrograms = setUpAddProgramsToClass();
      addPrograms.setProgramNamesList(['A']);
      return addPrograms;
    })(),
    message: '"programNamesList[0]" length must be at least 3 characters long'
  },
  {
    scenario: 'the program name is greater than the maximum character limit',
    addProgramsToClass: (() => {
      const addPrograms = setUpAddProgramsToClass();
      addPrograms.setProgramNamesList(
        ['abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890']
      );
      return addPrograms;
    })(),
    message: '"programNamesList[0]" length must be less than or equal to 30 characters long'
  },
  {
    scenario: 'the program names is missing',
    addProgramsToClass: (() => {
      const addPrograms = setUpAddProgramsToClass(true, true, false);
      return addPrograms;
    })(),
    message: '"programNamesList" must contain at least 1 items'
  },
  {
    scenario: 'the class uuid is empty',
    addProgramsToClass: (() => {
      const addPrograms = setUpAddProgramsToClass(false, true, true);
      return addPrograms;
    })(),
    message:  '"externalClassUuid" is not allowed to be empty'
  },
  {
    scenario: 'the organization uuid is empty',
    addProgramsToClass: (() => {
      const addPrograms = setUpAddProgramsToClass(true, false, true);
      return addPrograms;
    })(),
    message: '"externalOrganizationUuid" is not allowed to be empty'
  },
  {
    scenario: 'the program name is an empty string',
    addProgramsToClass: (() => {
      const addPrograms = setUpAddProgramsToClass();
      addPrograms.setProgramNamesList(['']);
      return addPrograms;
    })(),
    message: '"programNamesList[0]" is not allowed to be empty'
  },
];

describe('add programs to class validation', () => {
  let schoolStub: SinonStub;
  let classStub: SinonStub;
  const ctx = Context.getInstance();

  beforeEach(async () => {
    process.env.ADMIN_SERVICE_API_KEY = uuidv4();
    const admin = await AdminService.getInstance(); 
    classStub = sinon.stub(ClassDB, 'findOne').resolves({
        externalUuid: uuidv4(),
        externalOrgUuid: uuidv4(),
        externalSchoolUuid: uuidv4(),
        klUuid: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date()
      });
    schoolStub = sinon
      .stub(SchoolDB, 'getProgramsForSchool')
      .resolves([{id: uuidv4(), name: "Test program"}]);
    const classId = uuidv4();
    sinon.stub(ctx, 'getOrganizationId').resolves(uuidv4());
    sinon.stub(ctx, 'getClassId').resolves(classId);
    sinon.stub(ctx, 'programsAreValid').resolves([{id: uuidv4(), name: "Test program"}]);
    sinon
      .stub(admin, 'addProgramsToClass')
      .resolves([{ id: classId, name: 'Test class' }]);
  });

  afterEach(() => {
    schoolStub.restore();
    classStub.restore();
    sinon.restore();
  });

  VALID_ADD_PROGRAMS_TO_CLASS.forEach(({ scenario, addProgramsToClass: c }) => {
    it(`should pass when a add programs to class is ${scenario}`, async () => {
      const req = wrapRequest(c);
      const resp = await processOnboardingRequest(req, LOG_STUB);
      const responses = resp.getResponsesList();
      expect(responses).to.have.length(1);
      expect(responses[0]).not.to.be.undefined;
      expect(responses[0].getSuccess()).to.be.true;
    });
  });

  describe('should fail when ', () => {
    INVALID_ADD_PROGRAMS_TO_CLASS.forEach(({ scenario, addProgramsToClass: c, message: m }) => {
      it(scenario, async () => {
        const req = wrapRequest(c);
        const resp = await makeCommonAssertions(req, m);
        const response = resp.toObject().responsesList[0];
        expect(response.errors?.validation).not.to.be.undefined;
      });
    });
  });

  it('should fail if the school ID is not in the database', async () => {
    const req = wrapRequest(VALID_ADD_PROGRAMS_TO_CLASS[0].addProgramsToClass);
    schoolStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB, [], {}, 
        ["Invalid School"]
      )
    );
    await makeCommonAssertions(req, 'Invalid School');
  });

  it('should fail if the class ID is not in the database', async () => {
    const req = wrapRequest(VALID_ADD_PROGRAMS_TO_CLASS[0].addProgramsToClass);
    classStub.rejects(
        new OnboardingError(
          MachineError.VALIDATION,
          'Invalid',
          Category.REQUEST,
          LOG_STUB, [], {}, 
          ["Invalid Class"]
        )
      );
    await makeCommonAssertions(req, 'Invalid Class');   
  });

  it('should fail if the program name does not match', async () => {
    const addProgramsToClass = VALID_ADD_PROGRAMS_TO_CLASS[0].addProgramsToClass
        .setProgramNamesList(['Some other program']);
    const req = wrapRequest(addProgramsToClass);
    await makeCommonAssertions(req);
  });
});

function setUpAddProgramsToClass(
  classId = true,
  orgId = true,
  programs = true
): AddProgramsToClass {
  const addProgramToClass = new AddProgramsToClass();
  if (classId) addProgramToClass.setExternalClassUuid(uuidv4());
  if (orgId) addProgramToClass.setExternalOrganizationUuid(uuidv4());
  if (programs) addProgramToClass.setProgramNamesList(["Test program"]);
  return addProgramToClass;
}

async function makeCommonAssertions(req: BatchOnboarding, expectedMessage?: string): Promise<Responses> {
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
    expect(response.entityId).to.equal(
      req.getRequestsList()[0].getLinkEntities()?.getAddProgramsToClass()?.getExternalClassUuid()
    );
    expect(response.entity).to.equal(Entity.CLASS);
    expect(response.errors?.validation).not.to.be.undefined;
    if (expectedMessage) {
        expect(response.errors?.validation?.errorsList[0].detailsList[0]).to.contains(expectedMessage);
    }
    return resp;
  } catch (error) {
    expect(error, 'this api should not error').to.be.undefined;
  }
  throw new Error('Unexpected reached the end of the test');
}
