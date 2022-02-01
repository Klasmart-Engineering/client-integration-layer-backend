import * as grpc from '@grpc/grpc-js';
import { Metadata, MetadataValue } from '@grpc/grpc-js';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, proto } from '../..';
import { prisma, PrismaClient as Con } from "@prisma/client";

const {
    School,
    OnboardingRequest,
    Action,
    BatchOnboarding,
    OnboardingClient
} = proto;

export type SchoolTestCase = {
    scenario: string;
    school: proto.School;
};

const SCHOOL = Object.freeze({
    name: true,
    externalUuid: true,
    externalOrganizationUuid: true,
    shortcode: true
});


export const VALID_SCHOOLS: SchoolTestCase[] = [
    {
        scenario: 'valid',
        school: setUpSchool(),
    },
];

export const INVALID_SCHOOLS_ENTITY_ALREADY_EXISTS: SchoolTestCase[] = [
    {
        scenario: 'already exists in Validation DB',
        school: (() => {
            const s = setUpSchool();
            s.setExternalUuid('3a254084-a24d-4493-a9a4-bbdeb22264b8');
            return s;
        })(),
    },
];

export const INVALID_SCHOOLS_ORG_NOT_EXIST: SchoolTestCase[] = [
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

export const ADD_MULTIPLE_SCHOOLS: SchoolTestCase[] = [
    {
        scenario: '',
        school: (() => {
            const s = setUpSchool();
            s.setExternalUuid(uuidv4())
            s.setName('Test School 11')
            return s;
        })(),
    }
];

const client = new OnboardingClient(
    '0.0.0.0:4200',
    grpc.ChannelCredentials.createInsecure()
);

describe.only('School Onboard Validation', () => {

    VALID_SCHOOLS.forEach(({ scenario, school }) => {
        it(`should pass when a school ${scenario}`, async () => {
            const req = new OnboardingRequest()
                .setRequestId(uuidv4())
                .setAction(Action.CREATE)
                .setSchool(school);

            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                const resp = response.getResponsesList()[0];
                expect(resp.getSuccess()).to.be.true;
                expect(resp.getEntityId()).to.equal(
                    school.getExternalUuid()
                );
                expect(resp.hasErrors()).to.be.false;
            }
        });
    });

    INVALID_SCHOOLS_ENTITY_ALREADY_EXISTS.forEach(({ scenario, school }) => {
        it(`should fail when a school ${scenario}`, async () => {
            const req = new OnboardingRequest()
                .setRequestId(uuidv4())
                .setAction(Action.CREATE)
                .setSchool(school);

            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                const resp = response.getResponsesList()[0];
                expect(resp.getSuccess()).to.be.false;
                expect(resp.getEntityId()).to.equal(
                    school.getExternalUuid()
                );
                expect(resp.getErrors()?.hasEntityAlreadyExists()).to.be.true;
            }
        });
    });

    INVALID_SCHOOLS_ORG_NOT_EXIST.forEach(({ scenario, school }) => {
        it(`should fail when a school ${scenario}`, async () => {
            const req = new OnboardingRequest()
                .setRequestId(uuidv4())
                .setAction(Action.CREATE)
                .setSchool(school);

            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                const resp = response.getResponsesList()[0];
                expect(resp.getSuccess()).to.be.false;
                expect(resp.getEntityId()).to.equal(
                    school.getExternalUuid()
                );
                expect(resp.getErrors()?.hasEntityDoesNotExist()).to.be.true;
            }
        });
    });

    INVALID_SCHOOLS_VALIDATION_ERROR.forEach(({ scenario, school }) => {
        it(`should fail when a school ${scenario}`, async () => {
            const req = new OnboardingRequest()
                .setRequestId(uuidv4())
                .setAction(Action.CREATE)
                .setSchool(school);

            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                const resp = response.getResponsesList()[0];
                expect(resp.getSuccess()).to.be.false;
                expect(resp.getEntityId()).to.equal(
                    school.getExternalUuid()
                );
                expect(resp.getErrors()?.hasValidation()).to.be.true;
            }
        });
    });

    ADD_MULTIPLE_SCHOOLS.forEach(({ scenario, school }) => {
        it(`should pass when multiple schools are added ${scenario}`, async () => {

            school.setName('Test School 26');
            school.setExternalUuid(uuidv4());
            school.setExternalOrganizationUuid('90da8a47-989c-4e80-a669-dfa4912596b3');
            school.setShortCode('SCHOOL26');

            const req = new OnboardingRequest()
                .setRequestId(uuidv4())
                .setAction(Action.CREATE)
                .setSchool(school);

            const school1 = new School();
            school1.setName('Test School 27');
            school1.setExternalUuid(uuidv4());
            school1.setExternalOrganizationUuid('90da8a47-989c-4e80-a669-dfa4912596b3');
            school1.setShortCode('SCHOOL27');

            const req1 = new OnboardingRequest()
                .setRequestId(uuidv4())
                .setAction(Action.CREATE)
                .setSchool(school1);

            const school2 = new School();
            school2.setName('Test School 28');
            school2.setExternalUuid(uuidv4());
            school2.setExternalOrganizationUuid('90da8a47-989c-4e80-a669-dfa4912596b3');
            school2.setShortCode('SCHOOL28');

            const req2 = new OnboardingRequest()
                .setRequestId(uuidv4())
                .setAction(Action.CREATE)
                .setSchool(school2);

            const response = await onboard([req, req1, req2]);

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
    if (name) s.setName('Test School 11');
    if (uuid) s.setExternalUuid(uuidv4());
    if (orgId) s.setExternalOrganizationUuid('90da8a47-989c-4e80-a669-dfa4912596b3');
    if (shortcode) s.setShortCode('SCHOOL16');
    return s;
}