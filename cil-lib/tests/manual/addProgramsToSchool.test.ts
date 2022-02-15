import { expect } from 'chai';
import {
  addProgramsToSchoolReq,
  createOrg,
  onboard,
  persistPrograms,
  schoolReq,
  setUpSchool,
} from './util';

import {
  AddProgramsToSchool,
  BatchOnboarding,
} from '../../../cil-lib/src/lib/protos';
import { ExternalUuid } from '../../src';

export type AddProgramsToSchoolTestCase = {
  scenario: string;
  addProgramsToSchool: AddProgramsToSchool;
};

function setUpProgramsToSchool(
  schoolId: ExternalUuid,
  programNames = ['Math', 'Science']
): AddProgramsToSchool {
  return new AddProgramsToSchool()
    .setExternalSchoolUuid(schoolId)
    .setProgramNamesList(programNames);
}

describe('Adding programs to school', () => {
  let orgId: ExternalUuid;

  before(async () => {
    orgId = await createOrg();
    // Add programs from admin service to generic backend db
    await persistPrograms(orgId);
  });

  it('should pass when adding programs to school with dupes', async () => {
    const school1 = setUpSchool(orgId);
    const school2 = setUpSchool(orgId);

    const response = await onboard(
      new BatchOnboarding().setRequestsList([
        schoolReq(school1),
        schoolReq(school2),
        addProgramsToSchoolReq(
          setUpProgramsToSchool(school1.getExternalUuid())
        ),
        addProgramsToSchoolReq(
          setUpProgramsToSchool(school2.getExternalUuid())
        ),
      ])
    );

    expect(response.getResponsesList()).to.be.length(4);
    expect(
      response.getResponsesList().filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      response.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(0);

    // Dupe request 2 schools with 2 programs (Math & Science)
    const dupeResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        addProgramsToSchoolReq(
          setUpProgramsToSchool(school1.getExternalUuid())
        ),
        addProgramsToSchoolReq(
          setUpProgramsToSchool(school2.getExternalUuid())
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
        addProgramsToSchoolReq(
          setUpProgramsToSchool(school1.getExternalUuid(), [
            'Math',
            'Science',
            'Bada Genius',
          ])
        ),
        addProgramsToSchoolReq(
          setUpProgramsToSchool(school2.getExternalUuid())
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
