import * as grpc from '@grpc/grpc-js';
import { Metadata, MetadataValue } from '@grpc/grpc-js';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { proto } from '../..';
import { OnboardingRequest } from '../../dist/main/lib/protos';

const {
    School,
    Action,
    BatchOnboarding,
    OnboardingClient
} = proto;

export type SchoolTestCase = {
    scenario: string;
    school: proto.School;
};

export type SchoolTestCaseMultipleSchools = {
    scenario: string;
    schools: proto.School[]
};

const SCHOOL = Object.freeze({
    name: true,
    externalUuid: true,
    externalOrganizationUuid: true,
    shortcode: true
});

const client = new OnboardingClient(
    '0.0.0.0:4200',
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
        school: (() => {
            const s = setUpSchool();
            s.setExternalUuid('3a254084-a24d-4493-a9a4-bbdeb22264b8');
            return s;
        })(),
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

            const schoolLaniteio = setUpSchool();
            schoolLaniteio.setName('Test School 59');
            schoolLaniteio.setExternalUuid(uuidv4());
            schoolLaniteio.setShortCode('SCHOOL59');

            const schoolTheklio = setUpSchool();
            schoolTheklio.setName('Test School 60');
            schoolTheklio.setExternalUuid(uuidv4());
            schoolTheklio.setShortCode('SCHOOL60');

            const schoolAgFyla = new School();
            schoolAgFyla.setName('Test School 61');
            schoolAgFyla.setExternalUuid(uuidv4());
            schoolAgFyla.setShortCode('SCHOOL61');

            multipleSchools.push(schoolLaniteio);
            multipleSchools.push(schoolTheklio);
            multipleSchools.push(schoolAgFyla);

            return multipleSchools;
        })(),
    }
];

function createRequest(school: proto.School, action: proto.Action): OnboardingRequest {

    return new OnboardingRequest().setRequestId(uuidv4())
        .setAction(action)
        .setSchool(school);
}

const onboard = async (reqs: proto.OnboardingRequest[]) => {
    return new Promise((resolve, reject) => {

        const req = new BatchOnboarding().setRequestsList(reqs);
        const metadata = new Metadata();

        metadata.set('x-api-key', 'abcxyz'); // change it to process.env.API_KEY 
        client.onboard(req, metadata, (error, response) => {
            if (error !== null) {
                console.error('Received Error\n', error);
                reject(error);
                return;
            }
            resolve(response);
        });
    });
};

function setUpSchool(
    name = true,
    uuid = true,
    orgId = true,
    shortcode = true
): proto.School {
    const s = new School();
    if (name) s.setName('St Stephens School 3');
    if (uuid) s.setExternalUuid(uuidv4());
    // Assume that the organization exists
    if (orgId) s.setExternalOrganizationUuid('90da8a47-989c-4e80-a669-dfa4912596b3');
    if (shortcode) s.setShortCode('StS3');
    return s;
}

describe('School Onboard Validation', () => {

    VALID_SCHOOLS.forEach(({ scenario, school }) => {
        it(`should pass when a school ${scenario}`, async () => {

            const req = createRequest(school, Action.CREATE);
            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
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

            const req = createRequest(school, Action.CREATE);
            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                expect(response.getResponsesList()[0].getSuccess()).to.be.false;
                expect(response.getResponsesList()[0].getEntityId()).to.equal(
                    school.getExternalUuid()
                );
                expect(response.getResponsesList()[0].getErrors()?.hasEntityAlreadyExists()).to.be.true;
            }
        });
    });

    INVALID_SCHOOLS_ENTITY_NOT_EXIST.forEach(({ scenario, school }) => {
        it(`should fail when a school ${scenario}`, async () => {

            const req = createRequest(school, Action.CREATE);
            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                expect(response.getResponsesList()[0].getSuccess()).to.be.false;
                expect(response.getResponsesList()[0].getEntityId()).to.equal(
                    school.getExternalUuid()
                );
                expect(response.getResponsesList()[0].getErrors()?.hasEntityDoesNotExist()).to.be.true;
            }
        });
    });

    INVALID_SCHOOLS_VALIDATION_ERROR.forEach(({ scenario, school }) => {
        it(`should fail when a school ${scenario}`, async () => {

            const req = createRequest(school, Action.CREATE);
            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                expect(response.getResponsesList()[0].getSuccess()).to.be.false;
                expect(response.getResponsesList()[0].getEntityId()).to.equal(
                    school.getExternalUuid()
                );
                expect(response.getResponsesList()[0].getErrors()?.hasValidation()).to.be.true;
            }
        });
    });

    VALID_SCHOOLS_ADD_MULTIPLE.forEach(({ scenario, schools }) => {
        it(`should pass when ${scenario}`, async () => {

            // Create Requests
            const requests: OnboardingRequest[] = [];
            for (const school of schools) {
                const req = createRequest(school, Action.CREATE);
                requests.push(req);
            }

            // Get Response
            const response = await onboard(requests);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(3)
                const resps = response.getResponsesList();
                for (const resp of resps) {
                    expect(resp.getSuccess()).to.be.true;
                    expect(resp.hasErrors()).to.be.false;
                }
            }
        });
    });
});