import * as grpc from '@grpc/grpc-js';
import { Metadata, MetadataValue } from '@grpc/grpc-js';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { proto } from '../..';
import { OnboardingRequest } from '../../dist/main/lib/protos';
import { RequestMetadata } from '../../src/lib/protos';


const {
    User,
    OnboardingRequest,
    Action,
    BatchOnboarding,
    OnboardingClient
} = proto;

const USER = Object.freeze({
    externalUuid: true,
    externalOrganizationUuid: true,
    email: true,
    phone: true,
    username: true,
    givenName: true,
    familyName: true,
    gender: true,
    dateOfBirth: true,
    shortCode: true,
    roleIdentifiers: true
});


const client = new OnboardingClient(
    `${process.env.GENERIC_BACKEND_URL}`,
    grpc.ChannelCredentials.createInsecure()
);

export type UserTestCase = {
    scenario: string;
    user: proto.User;
};

export const VALID_USERS: UserTestCase[] = [
    {
        scenario: 'is valid',
        user: setUpUser(),

    }
];

export const INVALID_USERS: UserTestCase[] = [
    {
        scenario: 'a user contains everything but not a phone number',
        user: setUpUser({ ...USER, phone: false }),
    },
    {
        scenario: 'a user the phone and email are missing',
        user: (() => {
            const s = setUpUser({ ...USER, phone: false, email: false });
            return s;
        })(),
    },
    {
        scenario: 'roles are invalid',
        user: (() => {
            const s = setUpUser({ ...USER });
            s.setRoleIdentifiersList(['Student', 'Teacher'])
            return s;
        })(),
    },
];

export const INVALID_USER_EXISTS: UserTestCase[] = [
    {
        scenario: 'a user already exists',
        user: (() => {
            const s = setUpUser({ ...USER });
            s.setExternalUuid("84c6712a-3b3c-44bc-95dc-cfce8e90f72a");
            return s;
        })(),
    }
];

export const INVALID_USER_ENTITY_DOES_NOT_EXISTS: UserTestCase[] = [
    {
        scenario: 'when an organization does not exist',
        user: (() => {
            const s = setUpUser({ ...USER });
            s.setExternalOrganizationUuid('73d81055-4cbe-4d02-a1ab-bf267675c4ff');
            return s;
        })(),
    }
];

function createRequest(user: proto.User, action: proto.Action): OnboardingRequest {

    const requestMetadata = new RequestMetadata()
    requestMetadata.setId(uuidv4());
    requestMetadata.setN("1");

    return new OnboardingRequest().setRequestId(requestMetadata)
        .setAction(action)
        .setUser(user);
}

const onboard = async (reqs: proto.OnboardingRequest[]) => {
    return new Promise((resolve, reject) => {

        const req = new BatchOnboarding().setRequestsList(reqs);
        const metadata = new Metadata();
        const apiKey = process.env.API_KEY;
        metadata.set('x-api-key', `${apiKey}`);

        client.onboard(req, metadata, (error, response) => {
            if (error !== null) {
                reject(error);
                return;
            }
            resolve(response);
        });
    });
};

function setUpUser(user = USER): proto.User {
    const {
        externalUuid,
        externalOrganizationUuid,
        email,
        phone,
        username,
        givenName,
        familyName,
        gender,
        dateOfBirth,
        shortCode,
        roleIdentifiers
    } = user;
    const u = new User();
    if (externalUuid) u.setExternalUuid(uuidv4());
    if (externalOrganizationUuid) u.setExternalOrganizationUuid('47a0c632-5c08-4b2e-ac91-9f798219203a');
    if (email) u.setEmail('testtest.com');
    if (phone) u.setPhone('+912212345678');
    if (username) u.setUsername('USERNAME');
    if (givenName) u.setGivenName('Name');
    if (familyName) u.setFamilyName('Name');
    if (gender) u.setGender(proto.Gender.MALE);
    if (dateOfBirth) u.setDateOfBirth('09-01-2017');
    if (shortCode) u.setShortCode("abcdef");
    if (roleIdentifiers) u.addRoleIdentifiers("Student");
    return u;
}

describe('User Onboard Validation', () => {

    INVALID_USERS.forEach(({ scenario, user }) => {
        it(`should fail when ${scenario}`, async () => {
            const req = createRequest(user, Action.CREATE);
            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                const resp = response.getResponsesList()[0];
                expect(resp.getSuccess()).to.be.false;
                expect(resp.getEntityId()).to.be.equal(user.getExternalUuid());
                expect(resp.getErrors()?.hasValidation()).to.be.true;
            }
        });
    });

    INVALID_USER_EXISTS.forEach(({ scenario, user }) => {
        it(`should fail when a user ${scenario}`, async () => {
            const req = createRequest(user, Action.CREATE);
            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                const resp = response.getResponsesList()[0];
                expect(resp.getSuccess()).to.be.false;
                expect(resp.getEntityId()).to.be.equal(user.getExternalUuid());
                expect(resp.getErrors()?.hasEntityAlreadyExists()).to.be.true;
            }
        });
    });

    INVALID_USER_ENTITY_DOES_NOT_EXISTS.forEach(({ scenario, user }) => {
        it(`should fail when a user ${scenario}`, async () => {

            const req = createRequest(user, Action.CREATE);
            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                const resp = response.getResponsesList()[0];
                expect(resp.getSuccess()).to.be.false;
                expect(resp.getEntityId()).to.be.equal(user.getExternalUuid());
                expect(resp.getErrors()?.hasEntityDoesNotExist()).to.be.true;
            }
        });
    });

    VALID_USERS.forEach(({ scenario, user }) => {
        it(`should pass when a user ${scenario}`, async () => {

            const req = createRequest(user, Action.CREATE);
            const response = await onboard([req]);

            if (response instanceof proto.Responses) {
                expect(response.getResponsesList()).to.be.length(1)
                const resp = response.getResponsesList()[0];
                expect(resp.getSuccess()).to.be.true;
                expect(resp.getEntityId()).to.equal(
                    user.getExternalUuid()
                );
                expect(resp.hasErrors()).to.be.false;
            }
        });
    });
});