import * as grpc from '@grpc/grpc-js';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { proto } from '../..';
import { OnboardingRequest } from '../../dist/main/lib/protos';
import { RequestMetadata } from '../../src/lib/protos';
import { onboard } from './util';

const { School, Action, OnboardingClient } = proto;

export type SchoolTestCase = {
  scenario: string;
  school: proto.School;
};

export type SchoolTestCaseMultipleSchools = {
  scenario: string;
  schools: proto.School[];
};

const client = new OnboardingClient(
  `${process.env.GENERIC_BACKEND_URL}`,
  grpc.ChannelCredentials.createInsecure()
);

export const VALID_SCHOOLS: SchoolTestCase[] = [
  {
    scenario: 'valid',
    school: setUpSchool(),
  },
];

export const INVALID_SCHOOLS_ENTITY_ALREADY_EXISTS: SchoolTestCase[] = [
  {
    scenario: 'is already validated',
    school: setUpSchool(),
  },
];

export const INVALID_SCHOOLS_ENTITY_NOT_EXIST: SchoolTestCase[] = [
  {
    scenario: 'the org does not exist',
    school: (() => {
      const s = setUpSchool();
      s.setExternalOrganizationUuid('3a254084-a24d-4493-a9a4-bbdeb22264b8');
      return s;
    })(),
  },
];

export const INVALID_SCHOOLS_VALIDATION_ERROR: SchoolTestCase[] = [
  {
    scenario: 'shortcode is not correct',
    school: (() => {
      const s = setUpSchool();
      s.setShortCode('A');
      return s;
    })(),
  },
  {
    scenario: 'external uuid is not valid',
    school: (() => {
      const s = setUpSchool();
      s.setExternalUuid('dfsdsf');
      return s;
    })(),
  },
];

export const VALID_SCHOOLS_ADD_MULTIPLE: SchoolTestCaseMultipleSchools[] = [
  {
    scenario: 'multiple schools are added',
    schools: (() => {
      const multipleSchools: proto.School[] = [];

      for (let i = 0; i < 3; i += 1) {
        const school = setUpSchool();
        school
          .setName(`Test School ${i}`)
          .setExternalUuid(uuidv4())
          .setExternalOrganizationUuid('90da8a47-989c-4e80-a669-dfa4912596b3')
          .setShortCode(`SCHOOL-${i}`);
        multipleSchools.push(school);
      }

      return multipleSchools;
    })(),
  },
];

function createRequest(
  school: proto.School,
  action: proto.Action
): OnboardingRequest {
  const requestMetadata = new RequestMetadata();
  requestMetadata.setId(uuidv4());
  requestMetadata.setN('1');

  return new OnboardingRequest()
    .setRequestId(requestMetadata)
    .setAction(action)
    .setSchool(school);
}

function setUpSchool(
  name = true,
  uuid = true,
  orgId = true,
  shortcode = true
): proto.School {
  const s = new School();
  if (name) s.setName('Test School 1');
  if (uuid) s.setExternalUuid(uuidv4());
  // Assume that the organization exists
  if (orgId)
    s.setExternalOrganizationUuid('90da8a47-989c-4e80-a669-dfa4912596b3');
  if (shortcode) s.setShortCode('SCHOOL1');
  return s;
}

describe.skip('School Onboard Validation', () => {
  VALID_SCHOOLS.forEach(({ scenario, school }) => {
    it(`should pass when a school ${scenario}`, async () => {
      const req = createRequest(school, Action.CREATE);
      const response = await onboard([req]);

      if (response instanceof proto.Responses) {
        expect(response.getResponsesList()).to.be.length(1);
        expect(response.getResponsesList()[0].getSuccess()).to.be.true;
        expect(response.getResponsesList()[0].getEntityId()).to.equal(
          school.getExternalUuid()
        );
        expect(response.getResponsesList()[0].hasErrors()).to.be.false;
      }
    });
  });

  INVALID_SCHOOLS_ENTITY_ALREADY_EXISTS.forEach(({ scenario, school }) => {
    it(`should fail when a school ${scenario}`, async () => {
      const requests: proto.OnboardingRequest[] = [];
      const req = createRequest(school, Action.CREATE);

      await onboard([req]);
      const response = await onboard([req]);

      if (response instanceof proto.Responses) {
        expect(response.getResponsesList()[0].getSuccess()).to.be.false;
        expect(
          response.getResponsesList()[0].getErrors()?.hasEntityAlreadyExists()
        ).to.be.true;
      }
    });
  });

  INVALID_SCHOOLS_ENTITY_NOT_EXIST.forEach(({ scenario, school }) => {
    it(`should fail when a school ${scenario}`, async () => {
      const req = createRequest(school, Action.CREATE);
      const response = await onboard([req]);

      if (response instanceof proto.Responses) {
        expect(response.getResponsesList()).to.be.length(1);
        expect(response.getResponsesList()[0].getSuccess()).to.be.false;
        expect(response.getResponsesList()[0].getEntityId()).to.equal(
          school.getExternalUuid()
        );
        expect(
          response.getResponsesList()[0].getErrors()?.hasEntityDoesNotExist()
        ).to.be.true;
      }
    });
  });

  INVALID_SCHOOLS_VALIDATION_ERROR.forEach(({ scenario, school }) => {
    it(`should fail when a school ${scenario}`, async () => {
      const req = createRequest(school, Action.CREATE);
      const response = await onboard([req]);

      if (response instanceof proto.Responses) {
        expect(response.getResponsesList()).to.be.length(1);
        expect(response.getResponsesList()[0].getSuccess()).to.be.false;
        expect(response.getResponsesList()[0].getEntityId()).to.equal(
          school.getExternalUuid()
        );
        expect(response.getResponsesList()[0].getErrors()?.hasValidation()).to
          .be.true;
      }
    });
  });

  VALID_SCHOOLS_ADD_MULTIPLE.forEach(({ scenario, schools }) => {
    it(`should pass when ${scenario}`, async () => {
      const requests: proto.OnboardingRequest[] = [];
      for (const school of schools) {
        const req = createRequest(school, Action.CREATE);
        requests.push(req);
      }

      const response = await onboard(requests);

      if (response instanceof proto.Responses) {
        expect(response.getResponsesList()).to.be.length(3);
        const resps = response.getResponsesList();
        for (const resp of resps) {
          expect(resp.getSuccess()).to.be.true;
          expect(resp.hasErrors()).to.be.false;
        }
      }
    });
  });
});
