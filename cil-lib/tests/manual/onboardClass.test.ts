import * as grpc from '@grpc/grpc-js';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { OnboardingRequest } from '../../dist/main/lib/protos';
import { RequestMetadata } from '../../src/lib/protos';
import { wrapRequest } from '../util';
import { onboard } from './util';

import {
  Action,
  BatchOnboarding,
  OnboardingClient,
  Responses,
  Class,
} from '../../../cil-lib/src/lib/protos';
import { proto } from '../../src';

export type ClassTestCase = {
    scenario: string;
    clazz: Class;
};

const client = new OnboardingClient(
    `${process.env.GENERIC_BACKEND_URL}`,
    grpc.ChannelCredentials.createInsecure()
);

export const VALID_CLASSES: ClassTestCase[] = [  
    {
        scenario: 'valid',
        clazz: setUpClass()
    },
    {
      scenario: 'valid and the shortcode is missing',
      clazz: setUpClass(true, true, true, true, false)
    },
];

export const INVALID_CLASSES: ClassTestCase[] = [  
  {
    scenario: 'invalid failed the schema validation for shortcode',
    clazz: (() => {
      const s = setUpClass();
      s.setShortCode('Ajlsdhfjdhfsljjsldfdfj');
      return s;
    })(),
  },
];

function setUpClass(
    name = true,
    uuid = true,
    schoolId = true,
    orgId = true,
    shortcode = true
): Class {
    const c = new Class();
    if (name) c.setName('My Class');
    if (uuid) c.setExternalUuid(uuidv4());
    // Assume that the organization and school exists
    if (orgId)
        c.setExternalOrganizationUuid('4ce94dd5-6e03-4141-bf90-91a84e03dc77');
    if (schoolId)    
        c.setExternalSchoolUuid('8162959d-451c-4f0c-b18d-6c24d4b4444b');
    if (shortcode) c.setShortCode('ABCDXZ7');
    return c;
}

describe.skip('Class Onboard Validation', () => {
    VALID_CLASSES.forEach(({ scenario, clazz }) => {
      it(`should pass when a class ${scenario}`, async () => {
        const req = wrapRequest(clazz);
        const response = await onboard(req);
        if (response instanceof Responses) {
          expect(response.getResponsesList()).to.be.length(1);
          expect(response.getResponsesList()[0].getSuccess()).to.be.true;
          expect(response.getResponsesList()[0].getEntityId()).to.equal(
            clazz.getExternalUuid()
          );
          expect(response.getResponsesList()[0].hasErrors()).to.be.false;
        }
      });
    });

    INVALID_CLASSES.forEach(({ scenario, clazz }) => {
      it(`should fail when a class ${scenario}`, async () => {
        const req = wrapRequest(clazz);
        const response = await onboard(req);
        if (response instanceof Responses) {
          expect(response.getResponsesList()).to.be.length(1);
          expect(response.getResponsesList()[0].getSuccess()).to.be.false;
          expect(response.getResponsesList()[0].getEntityId()).to.equal(
            clazz.getExternalUuid()
          );
          expect(response.getResponsesList()[0].getErrors()?.hasValidation()).to.be.true;
        }
      });
    });
});