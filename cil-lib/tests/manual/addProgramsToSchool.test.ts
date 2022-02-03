import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { proto } from '../..';
import { OnboardingRequest } from '../../dist/main/lib/protos';
import { Link, RequestMetadata } from '../../src/lib/protos';
import { onboard } from './util';

const { AddProgramsToSchool, Action } = proto;

export type AddProgramsToSchoolTestCase = {
  scenario: string;
  addProgramsToSchool: proto.AddProgramsToSchool;
};

export const VALID_ADD_PROGRAMS_TO_SCHOOLS: AddProgramsToSchoolTestCase[] = [
  {
    scenario: 'valid',
    addProgramsToSchool: setUpProgramsToSchool(),
  },
];

function createRequest(
  addPrograms: proto.AddProgramsToSchool,
  action: proto.Action
): OnboardingRequest {
  const requestMetadata = new RequestMetadata();
  requestMetadata.setId(uuidv4());
  requestMetadata.setN('1');

  return new OnboardingRequest()
    .setRequestId(requestMetadata)
    .setAction(action)
    .setLinkEntities(new Link().setAddProgramsToSchool(addPrograms));
}

function setUpProgramsToSchool(
  schoolId = true,
  programNames = true,
  orgId = true
): proto.AddProgramsToSchool {
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
      const req = createRequest(addProgramsToSchool, Action.CREATE);
      const response = await onboard([req]);

      if (response instanceof proto.Responses) {
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
