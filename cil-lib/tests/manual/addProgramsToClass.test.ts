import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { proto } from '../../dist/main';
import { OnboardingRequest } from '../../dist/main/lib/protos';
import { Link, RequestMetadata } from '../../src/lib/protos';
import { onboard } from './util';

const { AddProgramsToClass, Action } = proto;

export type AddProgramsToClassTestCase = {
  scenario: string;
  addProgramsToClass: proto.AddProgramsToClass;
};

export const VALID_ADD_PROGRAMS_TO_CLASS: AddProgramsToClassTestCase[] = [
  {
    scenario: 'valid',
    addProgramsToClass: setUpProgramsToClass(),
  },
];

function createRequest(
  addPrograms: proto.AddProgramsToClass,
  action: proto.Action
): OnboardingRequest {
  const requestMetadata = new RequestMetadata();
  requestMetadata.setId(uuidv4());
  requestMetadata.setN('1');

  return new OnboardingRequest()
    .setRequestId(requestMetadata)
    .setAction(action)
    .setLinkEntities(new Link().setAddProgramsToClass(addPrograms));
}

function setUpProgramsToClass(
  classId = true,
  programNames = true,
  orgId = true
): proto.AddProgramsToClass {
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
      const req = createRequest(addProgramsToClass, Action.CREATE);
      const response = await onboard([req]);

      if (response instanceof proto.Responses) {
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
