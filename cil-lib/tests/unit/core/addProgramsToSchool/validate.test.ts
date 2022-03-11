import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  MachineError,
  OnboardingError,
  processOnboardingRequest,
} from '../../../../src';
import { Link, School as SchoolDB } from '../../../../src/lib/database';
import {
  AddProgramsToSchool,
  BatchOnboarding,
  Entity,
  Responses,
} from '../../../../src/lib/protos';
import { AdminService } from '../../../../src/lib/services';
import { Context } from '../../../../src/lib/utils';
import { LOG_STUB, wrapRequest } from '../../../util';

export type AddProgramsToSchoolTestCase = {
  scenario: string;
  addProgramsToSchool: AddProgramsToSchool;
  message?: string;
};

export const VALID_ADD_PROGRAMS_TO_SCHOOL: AddProgramsToSchoolTestCase[] = [
  {
    scenario: 'valid',
    addProgramsToSchool: setUpAddProgramsToSchool(),
  },
];

export const INVALID_ADD_PROGRAMS_TO_SCHOOL: AddProgramsToSchoolTestCase[] = [
  {
    scenario: 'the program names are empty',
    addProgramsToSchool: (() => {
      const addPrograms = setUpAddProgramsToSchool();
      addPrograms.setProgramNamesList([]);
      return addPrograms;
    })(),
    message: '"programNamesList" must contain at least 1 items',
  },
  {
    scenario: 'the program name is less than the minimum character limit',
    addProgramsToSchool: (() => {
      const addPrograms = setUpAddProgramsToSchool();
      addPrograms.setProgramNamesList(['A']);
      return addPrograms;
    })(),
    message: '"programNamesList[0]" length must be at least 3 characters long',
  },
  {
    scenario: 'the program name is greater than the maximum character limit',
    addProgramsToSchool: (() => {
      const addPrograms = setUpAddProgramsToSchool();
      addPrograms.setProgramNamesList([
        'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890',
      ]);
      return addPrograms;
    })(),
    message:
      '"programNamesList[0]" length must be less than or equal to 30 characters long',
  },
  {
    scenario: 'the program names is missing',
    addProgramsToSchool: (() => {
      const addPrograms = setUpAddProgramsToSchool(true, false);
      return addPrograms;
    })(),
    message: '"programNamesList" must contain at least 1 items',
  },
  {
    scenario: 'the school uuid is empty',
    addProgramsToSchool: (() => {
      const addPrograms = setUpAddProgramsToSchool(false, true);
      return addPrograms;
    })(),
    message: '"externalSchoolUuid" is not allowed to be empty',
  },
  {
    scenario: 'the program name is an empty string',
    addProgramsToSchool: (() => {
      const addPrograms = setUpAddProgramsToSchool();
      addPrograms.setProgramNamesList(['']);
      return addPrograms;
    })(),
    message: '"programNamesList[0]" is not allowed to be empty',
  },
];

describe('add programs to school should', () => {
  let schoolStub: SinonStub;
  let adminStub: SinonStub;
  let getOrgStub: SinonStub;
  let orgIdStub: SinonStub;
  let programsStub: SinonStub;

  beforeEach(() => {
    const schoolId = uuidv4();
    adminStub = sinon.stub(AdminService, 'getInstance').resolves({
      addProgramsToSchool: sinon
        .stub()
        .resolves([{ id: schoolId, name: 'Test school' }]),
    } as unknown as AdminService);
    sinon.stub(Link, 'schoolBelongsToOrganization').resolves(uuidv4());
    sinon.stub(Link, 'linkProgramToSchool').resolves(uuidv4());
    getOrgStub = sinon.stub(SchoolDB, 'getExternalOrgId').resolves(uuidv4());

    orgIdStub = sinon.stub().resolves(uuidv4());
    schoolStub = sinon.stub().resolves(schoolId);
    programsStub = sinon
      .stub()
      .resolves([{ id: uuidv4(), name: 'Test program' }]);
    sinon.stub(Context, 'getInstance').resolves({
      getOrganizationId: orgIdStub,
      getSchoolId: schoolStub,
      programsAreValid: programsStub,
    } as unknown as Context);
  });

  afterEach(() => {
    sinon.restore();
  });

  VALID_ADD_PROGRAMS_TO_SCHOOL.forEach(
    ({ scenario, addProgramsToSchool: c }) => {
      it(`pass when a add programs to school is ${scenario}`, async () => {
        const req = wrapRequest(c);
        const resp = await processOnboardingRequest(req, LOG_STUB);
        const responses = resp.getResponsesList();
        expect(responses).to.have.length(1);
        expect(responses[0]).not.to.be.undefined;
        expect(responses[0].getSuccess()).to.be.true;
      });
    }
  );

  describe('fail when ', () => {
    INVALID_ADD_PROGRAMS_TO_SCHOOL.forEach(
      ({ scenario, addProgramsToSchool: c, message: m }) => {
        it(scenario, async () => {
          const req = wrapRequest(c);
          const resp = await makeCommonAssertions(req, m);
          const response = resp.toObject().responsesList[0];
          expect(response.errors?.validation).not.to.be.undefined;
        });
      }
    );
  });

  it('fail if the school ID is not in the database', async () => {
    const req = wrapRequest(
      VALID_ADD_PROGRAMS_TO_SCHOOL[0].addProgramsToSchool
    );
    schoolStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['Invalid School']
      )
    );
    await makeCommonAssertions(req, 'Invalid');
  });

  it('fail if the parent org ID is not in the database', async () => {
    const req = wrapRequest(
      VALID_ADD_PROGRAMS_TO_SCHOOL[0].addProgramsToSchool
    );
    getOrgStub.rejects(
      new OnboardingError(
        MachineError.VALIDATION,
        'Invalid',
        Category.REQUEST,
        LOG_STUB,
        [],
        {},
        ['Invalid Org']
      )
    );
    await makeCommonAssertions(req, 'Invalid');
  });

  it('fail if the program name does not match', async () => {
    const addProgramsToSchool =
      VALID_ADD_PROGRAMS_TO_SCHOOL[0].addProgramsToSchool;
    const req = wrapRequest(addProgramsToSchool);
    adminStub.resolves([{ id: uuidv4(), name: 'Test school1' }]);
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
      req
        .getRequestsList()[0]
        .getLinkEntities()
        ?.getAddProgramsToSchool()
        ?.getExternalSchoolUuid()
    );
    expect(response.entity).to.equal(Entity.SCHOOL);
    expect(response.errors?.internalServer).not.to.be.undefined;
  });
});

function setUpAddProgramsToSchool(
  schoolId = true,
  programs = true
): AddProgramsToSchool {
  const addProgramToSchool = new AddProgramsToSchool();
  if (schoolId) addProgramToSchool.setExternalSchoolUuid(uuidv4());
  if (programs) addProgramToSchool.setProgramNamesList(['Test program']);
  return addProgramToSchool;
}

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
    expect(response.entityId).to.equal(
      req
        .getRequestsList()[0]
        .getLinkEntities()
        ?.getAddProgramsToSchool()
        ?.getExternalSchoolUuid()
    );
    expect(response.entity).to.equal(Entity.SCHOOL);
    expect(response.errors?.validation).not.to.be.undefined;
    if (expectedMessage) {
      expect(
        response.errors?.validation?.errorsList[0].detailsList[0]
      ).to.contains(expectedMessage);
    }
    return resp;
  } catch (error) {
    expect(error, 'this api should not error').to.be.undefined;
  }
  throw new Error('Unexpected reached the end of the test');
}
