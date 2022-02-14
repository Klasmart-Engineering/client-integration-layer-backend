import { expect } from 'chai';
import exp from 'constants';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
    Category,
    MachineError,
    OnboardingError,
    processOnboardingRequest,
} from '../../../../src';
import { Class as ClassDB, School as SchoolDB } from '../../../../src/lib/database';
import {
    BatchOnboarding,
    AddProgramsToClass,
    Entity,
    Responses,
    AddClassesToSchool,
} from '../../../../src/lib/protos';
import { LOG_STUB, wrapRequest } from '../../../util';

export type AddClassesToSchoolTestCase = {
    scenario: string;
    addClassesToSchool: AddClassesToSchool;
};

export const VALID_ADD_CLASSES_TO_SCHOOL: AddClassesToSchoolTestCase[] = [
    {
        scenario: 'is valid',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalSchoolUuid("8162959d-451c-4f0c-b18d-6c24d4b4444b");
            addClasses.setExternalClassUuidsList(["c4621aee-818b-47e7-8760-47202f875e02"])
            return addClasses;
        })(),
    },
];

export const INVALID_ADD_CLASSES_TO_SCHOOL: AddClassesToSchoolTestCase[] = [
    {
        scenario: '- the external school uuid is invalid',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalSchoolUuid('6aec2c48-aa45-464c-b3ee-59cd');
            return addClasses;
        })(),
    },
    {
        scenario: '- the external school uuid is empty',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalSchoolUuid('');
            return addClasses;
        })(),
    },
    {
        scenario: '- class external uuid is invalid',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalClassUuidsList(['6aec2c48-aa45-464c-b3ee-59cd']);
            return addClasses;
        })(),
    },
    {
        scenario: '- school uuid is not given',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool(false, true);
            return addClasses
        })(),
    },
    {
        scenario: '- classes list is missing',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool(true, false);
            return addClasses
        })(),
    },
    {
        scenario: '- class uuid is empty string',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalClassUuidsList(['']);
            return addClasses;
        })(),
    }
]

export const VALID_ADD_CLASSES_TO_SCHOOL_MULTIPLE_CLASSES: AddClassesToSchoolTestCase[] = [

    {
        scenario: '3 classes one school - valid ',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalSchoolUuid("8162959d-451c-4f0c-b18d-6c24d4b4444b");
            addClasses.setExternalClassUuidsList(["c4621aee-818b-47e7-8760-47202f875e02", "3bdaaba4-3e0f-423b-aeb8-6351d0a6d61b", "e8d84a45-291c-4480-b383-4db6095ee728"]);
            return addClasses
        })(),
    }
]

export const INVALID_ADD_CLASSES_TO_SCHOOL_ONE_INVALID_CLASS: AddClassesToSchoolTestCase[] = [
    {
        scenario: '2 classes one school valid, Class failed entity doesnot exist',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalSchoolUuid("8162959d-451c-4f0c-b18d-6c24d4b4444b");
            addClasses.setExternalClassUuidsList(["10d1dd28-abe6-4dea-beec-90475efd2b1b", "d5209cbc-d432-4ffa-ae3a-a12957d8e685", "e8d84a45-291c-4480-b383-4db6095ee728"]);
            return addClasses
        })(),
    },  
]

export const INVALID_ADD_CLASSES_TO_SCHOOL_ONE_INVALID_CLASS_SCHEMA_VALIDATION: AddClassesToSchoolTestCase[] = [
    {
        scenario: '2 classes one school valid, Class uuid is not valid schema',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalSchoolUuid("8162959d-451c-4f0c-b18d-6c24d4b4444b");
            addClasses.setExternalClassUuidsList(["d5209cbc-d432-4ffa-ae3a-a12957d8e685", "10d1dd28-a-beec-90475efd2b1b", "e8d84a45-291c-4480-b383-4db6095ee728"]);
            return addClasses
        })(),
    },  
]

export const INVALID_ADD_CLASSES_TO_SCHOOL_OTHER: AddClassesToSchoolTestCase[] = [
    {
        scenario: '- external org uuid for this class and school is not the same',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalSchoolUuid("8162959d-451c-4f0c-b18d-6c24d4b4444b");
            addClasses.setExternalClassUuidsList(["3bdaaba4-3e0f-423b-aeb8-6351d0a6d61b"]);
            return addClasses
        })(),
    },    
]

export const INVALID_ADD_CLASSES_TO_SCHOOL_ENTITY_DOESNT_EXIST: AddClassesToSchoolTestCase[] = [
    {
        scenario: '- school id for this class is missing',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalSchoolUuid("b2890df8-3fd2-4337-94e1-2ff67ad7026a")
            addClasses.setExternalClassUuidsList(["6ef84009-ea4e-4a9a-9c7b-01ca353ec259"]);
            return addClasses
        })(),
    },
    {
        scenario: '- valid school uuid does not exist',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool()
            addClasses.setExternalSchoolUuid("c0c0c5ed-1af1-4929-9cd4-27b0b89b1ab2");
            addClasses.setExternalClassUuidsList(["3bdaaba4-3e0f-423b-aeb8-6351d0a6d61b"]);
            return addClasses
        })(),
    },
    {
        scenario: '- external school uuid for this class is not the same',
        addClassesToSchool: (() => {
            const addClasses = setUpAddClassesToSchool();
            addClasses.setExternalSchoolUuid("8a13ea20-ce0d-49f6-a634-66144fa413dd");
            addClasses.setExternalClassUuidsList(["d5209cbc-d432-4ffa-ae3a-a12957d8e685"]);
            return addClasses
        })(),
    },
]

describe('add classes to school validation', () => {

    INVALID_ADD_CLASSES_TO_SCHOOL.forEach(({ scenario, addClassesToSchool: c }) => {
        it(`should fail when adding classes to school  ${scenario}`, async () => {
            const req = wrapRequest(c);
            const resp = await processOnboardingRequest(req, LOG_STUB);
            const responses = resp.getResponsesList();

            expect(responses[0]).not.to.be.undefined;
            expect(responses[0].getSuccess()).to.be.false;
            expect(responses[0].getErrors()?.hasValidation()).to.be.true;
        });
    });
});

describe.skip('add classes to school validation - integration', () => {

    VALID_ADD_CLASSES_TO_SCHOOL.forEach(({ scenario, addClassesToSchool: c }) => {
        it(`should pass when adding classes to school ${scenario}`, async () => {
            const req = wrapRequest(c);
            const resp = await processOnboardingRequest(req, LOG_STUB);
            const responses = resp.getResponsesList();
            
            expect(responses).to.have.length(1);
            expect(responses[0]).not.to.be.undefined;
            expect(responses[0].getSuccess()).to.be.true;
        });
    });

    INVALID_ADD_CLASSES_TO_SCHOOL_ENTITY_DOESNT_EXIST.forEach(({ scenario, addClassesToSchool: c }) => {
        it(`should fail when adding classes to school  ${scenario}`, async () => {
            const req = wrapRequest(c);
            const resp = await processOnboardingRequest(req, LOG_STUB);
            const responses = resp.getResponsesList();
            
            expect(responses[0]).not.to.be.undefined;
            expect(responses).to.have.length(1);
            expect(responses[0].getSuccess()).to.be.false;
        });
    });

    INVALID_ADD_CLASSES_TO_SCHOOL_OTHER.forEach(({ scenario, addClassesToSchool: c }) => {
        it(`should fail when adding classes to school  ${scenario}`, async () => {
            const req = wrapRequest(c);
            const resp = await makeCommonAssertions(req);
            const response = resp.toObject().responsesList[0];
            expect(response.errors?.validation).not.to.be.undefined;
        });
    })

    VALID_ADD_CLASSES_TO_SCHOOL_MULTIPLE_CLASSES.forEach(({ scenario, addClassesToSchool: c }) => {
        it(`should pass when adding classes to school  ${scenario}`, async () => {
            const req = wrapRequest(c);
            const resp = await processOnboardingRequest(req, LOG_STUB);
            const responses = resp.getResponsesList();
            expect(responses).to.have.length(3);
            responses.forEach(resp => {
                const r = resp.toObject()
                expect(r).not.to.be.undefined;
                expect(r.success).to.be.true;
            });
            
        });
    })

    INVALID_ADD_CLASSES_TO_SCHOOL_ONE_INVALID_CLASS.forEach(({ scenario, addClassesToSchool: c }) => {
        it(`should partial pass when adding classes to school  ${scenario}`, async () => {
            const req = wrapRequest(c);
            const resp = await processOnboardingRequest(req, LOG_STUB);
            const responses = resp.getResponsesList();
            expect(responses).to.have.length(3);
            
            expect(responses[0]).not.to.be.undefined;
            expect(responses[0].getSuccess()).to.be.false;
            expect(responses[0].getErrors()?.hasEntityDoesNotExist()).to.be.true;
            expect(responses[1]).not.to.be.undefined;
            expect(responses[1].getSuccess()).to.be.true;
            expect(responses[2]).not.to.be.undefined;
            expect(responses[2].getSuccess()).to.be.true;
            
        });
    })

    INVALID_ADD_CLASSES_TO_SCHOOL_ONE_INVALID_CLASS_SCHEMA_VALIDATION.forEach(({ scenario, addClassesToSchool: c }) => {
        it(`should fail when adding classes to school  ${scenario}`, async () => {
            const req = wrapRequest(c);
            const resp = await processOnboardingRequest(req, LOG_STUB);
            const responses = resp.getResponsesList();
            expect(responses).to.have.length(3);
            
            expect(responses[0]).not.to.be.undefined;
            expect(responses[0].getSuccess()).to.be.false;
            expect(responses[0].getErrors()?.hasValidation()).to.be.true;
            expect(responses[1]).not.to.be.undefined;
            expect(responses[1].getSuccess()).to.be.false;
            expect(responses[1].getErrors()?.hasValidation()).to.be.true;
            expect(responses[2]).not.to.be.undefined;
            expect(responses[2].getSuccess()).to.be.false;
            expect(responses[2].getErrors()?.hasValidation()).to.be.true;
        });
    }) 
});

async function makeCommonAssertions(req: BatchOnboarding, expectedMessage?: string): Promise<Responses> {
    try {
        const resp = await processOnboardingRequest(req, LOG_STUB);
        expect(resp).not.to.be.undefined;
        const responses = resp.toObject().responsesList;
        expect(responses).to.have.lengthOf(1);
        const response = responses[0];
        expect(response.success).to.be.false;
        expect(response.requestId).to.eql(
            req.getRequestsList()[0].getRequestId()?.toObject()
        );
        expect(response.entity).to.equal(Entity.CLASS);
        expect(response.errors?.validation).not.to.be.undefined;
        return resp;
    } catch (error) {
        expect(error, 'this api should not error').to.be.undefined;
    }
    throw new Error('Unexpected reached the end of the test');
}

function setUpAddClassesToSchool(
    schoolId = true,
    classIds = true
): AddClassesToSchool {
    const addClassesToSchool = new AddClassesToSchool();
    if (schoolId) addClassesToSchool.setExternalSchoolUuid(uuidv4());
    if (classIds) addClassesToSchool.setExternalClassUuidsList([uuidv4()])
    return addClassesToSchool;
}