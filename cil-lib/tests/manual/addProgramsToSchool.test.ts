import { expect } from 'chai';
import { onboard } from './util';
import { wrapRequest } from '../util';

import {
  AddProgramsToSchool,
  Responses,
} from '../../../cil-lib/src/lib/protos';

export type AddProgramsToSchoolTestCase = {
  scenario: string;
  addProgramsToSchool: AddProgramsToSchool;
};

export const VALID_ADD_PROGRAMS_TO_SCHOOLS: AddProgramsToSchoolTestCase[] = [
  {
    scenario: 'valid',
    addProgramsToSchool: setUpProgramsToSchool(),
  },
];

function setUpProgramsToSchool(
  schoolId = true,
  programNames = true,
  orgId = true
): AddProgramsToSchool {
  const programs = new AddProgramsToSchool();
  // Assume that the school exists
  if (schoolId)
    programs.setExternalSchoolUuid('3bc869ec-d7f4-4f68-8b26-0f2a6504d241');
  // Assume that the programs exists
  if (programNames) programs.setProgramNamesList(['Math', 'Science']);
  // Assume that the organization exists
  if (orgId)
    programs.setExternalOrganizationUuid(
      '90da8a47-989c-4e80-a669-dfa4912596b3'
    );
  return programs;
}

describe.skip('Adding programs to school', () => {
  VALID_ADD_PROGRAMS_TO_SCHOOLS.forEach(({ scenario, addProgramsToSchool }) => {
    it(`should pass when adding programs to school ${scenario}`, async () => {
      const req = wrapRequest(addProgramsToSchool);
      const response = await onboard(req);

      if (response instanceof Responses) {
        expect(response.getResponsesList()).to.be.length(1);
        expect(response.getResponsesList()[0].getSuccess()).to.be.true;
        expect(response.getResponsesList()[0].getEntityId()).to.equal(
          addProgramsToSchool.getExternalSchoolUuid()
        );
        expect(response.getResponsesList()[0].hasErrors()).to.be.false;
      }
    });
  });
});
