import { expect } from 'chai';
import { onboard } from './util';
import { wrapRequest } from '../util';

import {
  AddUsersToOrganization,
  Responses,
} from '../../../cil-lib/src/lib/protos';

export type AddUsersToOrganizationTestCase = {
  scenario: string;
  addUsersToOrganization: AddUsersToOrganization;
};

export const VALID_ADD_USERS_TO_ORG: AddUsersToOrganizationTestCase[] = [
  {
    scenario: 'valid',
    addUsersToOrganization: setUpUsersToOrg(),
  },
];

function setUpUsersToOrg(
  userIds = true,
  roleNames = true,
  orgId = true
): AddUsersToOrganization {
  const addUsersToOrg = new AddUsersToOrganization();
  // Assume that the users exists
  if (userIds)
    addUsersToOrg.setExternalUserUuidsList([
      '81bab557-0ee9-45ec-ac2e-c41c1623c1e4',
    ]);
  // Assume that the role exists
  if (roleNames) addUsersToOrg.setRoleIdentifiersList(['Student', 'Teacher']);
  // Assume that the organization exists
  if (orgId)
    addUsersToOrg.setExternalOrganizationUuid(
      'fabd67e9-33d1-4908-842e-207192d06f7d'
    );
  return addUsersToOrg;
}

describe.only('Adding users to org', () => {
  VALID_ADD_USERS_TO_ORG.forEach(({ scenario, addUsersToOrganization }) => {
    it(`should pass when adding users to org ${scenario}`, async () => {
      const req = wrapRequest(addUsersToOrganization);
      const response = await onboard(req);

      if (response instanceof Responses) {
        expect(response.getResponsesList()).to.be.length(1);
        expect(response.getResponsesList()[0].getSuccess()).to.be.true;
        expect(response.getResponsesList()[0].getEntityId()).to.equal(
          addUsersToOrganization.getExternalUserUuidsList()[0]
        );
        expect(response.getResponsesList()[0].hasErrors()).to.be.false;
      }
    });
  });
});
