import { expect } from 'chai';
import {
  addClassesToSchoolReq,
  addProgramsToClassReq,
  addProgramsToSchoolReq,
  createOrg,
  onboard,
  persistPrograms,
  setUpClass,
  classReq,
  setUpSchool,
  schoolReq,
} from './util';

import {
  AddClassesToSchool,
  AddProgramsToClass,
  AddProgramsToSchool,
  BatchOnboarding,
} from '../../../cil-lib/src/lib/protos';
import { AdminService, ExternalUuid } from '../../src';

export type AddProgramsToClassTestCase = {
  scenario: string;
  addProgramsToClass: AddProgramsToClass;
};

function setUpProgramsToClass(
  externalClassId: ExternalUuid,
  programNames = ['Math', 'Science']
): AddProgramsToClass {
  const programs = new AddProgramsToClass();
  if (externalClassId) programs.setExternalClassUuid(externalClassId);
  if (programNames) programs.setProgramNamesList(programNames);
  return programs;
}

describe('Adding programs to class', () => {
  let orgId: ExternalUuid;
  let programs: string[] = [];

  before(async () => {
    orgId = await createOrg();
    await persistPrograms(orgId);
  });

  it('should pass when adding programs to class with dupes', async () => {
    const school = setUpSchool(orgId);
    const class1 = setUpClass(orgId, school.getExternalUuid());
    const class2 = setUpClass(orgId, school.getExternalUuid());
    const programNames = ['Math', 'Science'];
    const badaGenius = 'Bada Genius';

    const setUpResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        schoolReq(school),
        addClassesToSchoolReq(
          new AddClassesToSchool()
            .setExternalSchoolUuid(school.getExternalUuid())
            .setExternalClassUuidsList([
              class1.getExternalUuid(),
              class2.getExternalUuid(),
            ])
        ),
        classReq(class1),
        classReq(class2),
        addProgramsToSchoolReq(
          new AddProgramsToSchool()
            .setExternalSchoolUuid(school.getExternalUuid())
            .setProgramNamesList(programNames.concat([badaGenius]))
        ),
        addProgramsToClassReq(
          setUpProgramsToClass(class1.getExternalUuid(), programNames)
        ),
        addProgramsToClassReq(
          setUpProgramsToClass(class2.getExternalUuid(), programNames)
        ),
      ])
    );

    expect(setUpResponse.getResponsesList()).to.be.length(8);
    expect(
      setUpResponse
        .getResponsesList()
        .filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      setUpResponse
        .getResponsesList()
        .filter((response) => response.hasErrors())
    ).to.be.length(0);

    // dupe
    const dupeResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        addProgramsToClassReq(
          setUpProgramsToClass(class1.getExternalUuid(), programNames)
        ),
        addProgramsToClassReq(
          setUpProgramsToClass(class2.getExternalUuid(), programNames)
        ),
      ])
    );

    expect(dupeResponse.getResponsesList()).to.be.length(4);
    expect(
      dupeResponse
        .getResponsesList()
        .filter((response) => !response.getSuccess())
    ).to.be.length(4);
    expect(
      dupeResponse.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(4);
    expect(
      dupeResponse
        .getResponsesList()
        .map((error) => error.getErrors())
        .filter((error) => error!.getEntityAlreadyExists())
    ).to.be.length(4);

    // Same dupe request with one additional program Bada Genius
    const mixResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        addProgramsToClassReq(
          setUpProgramsToClass(
            class1.getExternalUuid(),
            programNames.concat([badaGenius])
          )
        ),
        addProgramsToClassReq(
          setUpProgramsToClass(class2.getExternalUuid(), programNames)
        ),
      ])
    );

    expect(mixResponse.getResponsesList()).to.be.length(5);
    expect(
      mixResponse
        .getResponsesList()
        .filter((response) => !response.getSuccess())
    ).to.be.length(4);
    expect(
      mixResponse.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(4);
    expect(
      mixResponse
        .getResponsesList()
        .filter((error) => error.hasErrors())
        .map((error) => error.getErrors()!)
        .filter((error) => error.getEntityAlreadyExists())
    ).to.be.length(4);
    expect(
      mixResponse.getResponsesList().filter((response) => response.getSuccess())
    ).to.be.length(1);
  });
});
