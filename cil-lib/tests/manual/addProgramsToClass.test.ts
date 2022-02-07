import { expect } from 'chai';
import { onboard } from './util';
import { wrapRequest } from '../util';

import { AddProgramsToClass, Responses } from '../../../cil-lib/src/lib/protos';

export type AddProgramsToClassTestCase = {
  scenario: string;
  addProgramsToClass: AddProgramsToClass;
};

export const VALID_ADD_PROGRAMS_TO_CLASS: AddProgramsToClassTestCase[] = [
  {
    scenario: 'valid',
    addProgramsToClass: setUpProgramsToClass(),
  },
];

function setUpProgramsToClass(
  classId = true,
  programNames = true,
  orgId = true
): AddProgramsToClass {
  const programs = new AddProgramsToClass();
  // Assume that the class exists
  if (classId)
    programs.setExternalClassUuid('b81f6211-e580-4e4c-ab65-c1a95c7129b0');
  // Assume that the programs exists
  if (programNames) programs.setProgramNamesList(['Math', 'Science']);
  // Assume that the organization exists
  if (orgId)
    programs.setExternalOrganizationUuid(
      '90da8a47-989c-4e80-a669-dfa4912596b3'
    );
  return programs;
}

describe.skip('Adding programs to class', () => {
  VALID_ADD_PROGRAMS_TO_CLASS.forEach(({ scenario, addProgramsToClass }) => {
    it(`should pass when adding programs to class ${scenario}`, async () => {
      const req = wrapRequest(addProgramsToClass);
      const response = await onboard(req);

      if (response instanceof Responses) {
        expect(response.getResponsesList()).to.be.length(1);
        expect(response.getResponsesList()[0].getSuccess()).to.be.true;
        expect(response.getResponsesList()[0].getEntityId()).to.equal(
          addProgramsToClass.getExternalClassUuid()
        );
        expect(response.getResponsesList()[0].hasErrors()).to.be.false;
      }
    });
  });
});
