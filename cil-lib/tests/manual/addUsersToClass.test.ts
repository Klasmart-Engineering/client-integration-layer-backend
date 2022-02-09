import { expect } from 'chai';
import { onboard } from './util';
import { wrapRequest } from '../util';

import { AddUsersToClass, Responses } from '../../../cil-lib/src/lib/protos';

export type AddUsersToClassTestCase = {
  scenario: string;
  addUsersToClass: AddUsersToClass;
};

export const VALID_ADD_USERS_TO_CLASS: AddUsersToClassTestCase[] = [
  {
    scenario: 'students to class',
    addUsersToClass: setUpAddUsers(true, true, false),
  },
  {
    scenario: 'teachers to class',
    addUsersToClass: setUpAddUsers(true, false, true),
  },
  {
    scenario: 'students & teachers to class',
    addUsersToClass: setUpAddUsers(),
  },
];

function setUpAddUsers(
  classId = true,
  studentIds = true,
  teacherIds = true
): AddUsersToClass {
  const addUsers = new AddUsersToClass();
  // Assume that the class exists
  if (classId)
    addUsers.setExternalClassUuid('b81f6211-e580-4e4c-ab65-c1a95c7129b0');
  // Assume that the students exists
  if (studentIds)
    addUsers.setExternalStudentUuidList([
      '6562ae26-8d1f-47dd-8a16-35454afdc238',
    ]);
  // Assume that the teachers exists
  if (teacherIds)
    addUsers.setExternalTeacherUuidList([
      '6562ae26-8d1f-47dd-8a16-35454afdc238',
    ]);
  return addUsers;
}

describe.skip('Adding users to class', () => {
  VALID_ADD_USERS_TO_CLASS.forEach(({ scenario, addUsersToClass }) => {
    it(`should pass when adding ${scenario}`, async () => {
      const req = wrapRequest(addUsersToClass);
      const response = await onboard(req);

      if (response instanceof Responses) {
        expect(response.getResponsesList()).to.be.length(1);
        expect(response.getResponsesList()[0].getSuccess()).to.be.true;
        expect(response.getResponsesList()[0].hasErrors()).to.be.false;
      }
    });
  });
});
