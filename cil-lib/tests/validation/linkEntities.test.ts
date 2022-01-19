import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import { Context, OnboardingError } from '../../src';
import {
  Action,
  Class,
  EntitiesToLink,
  Entity,
  LinkEntities,
  OnboardingRequest,
  Organization,
  School,
  User,
} from '../../src/lib/protos';
import { ValidationWrapper } from '../../src/lib/validation/validationWrapper';

import { LOG_STUB } from './util';

export class ErrorExpectation {
  msg: string;
  err: string;

  constructor(msg: string, err?: string) {
    this.msg = msg;
    this.err = err ?? 'bad request';
  }
}

export type LinkEntitiesTestCase = {
  scenario: string;
  linkedEntities?: LinkEntities;
  errorExpectation?: ErrorExpectation;
};

export const INVALID_LINK_ENTITY: LinkEntitiesTestCase[] = [
  {
    scenario: 'Missing LinkEntities',
    errorExpectation: new ErrorExpectation(
      "If Action is of type 'LINK', payload must be 'LinkEntities'"
    ),
  },
  {
    scenario:
      "LinkEntities missing 'ORGANIZATION', 'SCHOOL', 'CLASS' or 'USER'",
    linkedEntities: new LinkEntities(),
    errorExpectation: new ErrorExpectation(
      "A request to LinkEntities must include either an 'ORGANIZATION', 'SCHOOL', 'CLASS' or 'USER'"
    ),
  },
  {
    scenario:
      'Organization ID provided and the entity identifier provided did not match',
    linkedEntities: (() => {
      const entities = linkedEntities();
      entities.setOrganization(organization(uuidv4()));
      entities.setExternalOrganizationUuid(uuidv4());
      return entities;
    })(),
    errorExpectation: new ErrorExpectation(
      "Found that the Organization ID provided and the entity identifier provided did not match despite the entity being set to 'ORGANIZATION'"
    ),
  },
  {
    scenario: 'Missing school body',
    linkedEntities: (() => {
      const entities = linkedEntities();
      entities.setSchool(new School());
      return entities;
    })(),
    errorExpectation: new ErrorExpectation(
      'Expected to find data however it was undefined',
      'validation'
    ),
  },
  {
    scenario: 'Missing Class body',
    linkedEntities: (() => {
      const entities = linkedEntities();
      entities.setClass(new Class());
      return entities;
    })(),
    errorExpectation: new ErrorExpectation(
      'Expected to find data however it was undefined',
      'validation'
    ),
  },
  {
    scenario: 'Missing User body',
    linkedEntities: (() => {
      const entities = linkedEntities();
      entities.setUser(new User());
      return entities;
    })(),
    errorExpectation: new ErrorExpectation(
      'Expected to find data however it was undefined',
      'validation'
    ),
  },
];

export const VALID_LINK_ENTITIES: LinkEntitiesTestCase[] = [
  {
    scenario: 'Valid organization',
    linkedEntities: (() => {
      const entities = linkedEntities();
      const externalId = uuidv4();
      entities.setExternalOrganizationUuid(externalId);
      entities.setOrganization(organization(externalId));
      entities.setEntities(
        entitiesToLink(Entity.ORGANIZATION, [uuidv4(), uuidv4()])
      );
      return entities;
    })(),
  },
  {
    scenario: 'Valid school',
    linkedEntities: (() => {
      const entities = linkedEntities();
      const school = new School();
      school.setExternalUuid(uuidv4());
      entities.setSchool(school);
      entities.setEntities(entitiesToLink(Entity.SCHOOL, [uuidv4(), uuidv4()]));
      return entities;
    })(),
  },
  {
    scenario: 'Valid class',
    linkedEntities: (() => {
      const entities = linkedEntities();
      const clazz = new Class();
      clazz.setExternalUuid(uuidv4());
      entities.setClass(clazz);
      entities.setEntities(entitiesToLink(Entity.CLASS, [uuidv4(), uuidv4()]));
      return entities;
    })(),
  },
  {
    scenario: 'Valid user',
    linkedEntities: (() => {
      const entities = linkedEntities();
      const user = new User();
      user.setExternalUuid(uuidv4());
      entities.setUser(user);
      entities.setEntities(entitiesToLink(Entity.USER, [uuidv4(), uuidv4()]));
      return entities;
    })(),
  },
];

function onboardingRequest(linkedEntities?: LinkEntities): OnboardingRequest {
  const request = new OnboardingRequest();
  request.setAction(Action.LINK);
  request.setRequestId(uuidv4());
  request.setLinkEntities(linkedEntities);
  return request;
}

describe('linkEntities validation', () => {
  let organizationStub: SinonStub;
  let schoolStub: SinonStub;
  let classStub: SinonStub;
  let userStub: SinonStub;
  const ctx = Context.getInstance();

  beforeEach(() => {
    organizationStub = sinon.stub(ctx, 'organizationIdIsValid');
    schoolStub = sinon.stub(ctx, 'schoolIdIsValid');
    classStub = sinon.stub(ctx, 'classIdIsValid');
    userStub = sinon.stub(ctx, 'userIdIsValid');
  });

  afterEach(() => {
    organizationStub.restore();
    schoolStub.restore();
    classStub.restore();
    userStub.restore();
  });

  INVALID_LINK_ENTITY.forEach(
    ({ scenario, linkedEntities, errorExpectation }) => {
      it(`should fail when ${scenario}`, async () => {
        try {
          const resp = await ValidationWrapper.parseRequest(
            onboardingRequest(linkedEntities),
            LOG_STUB
          );
          expect(resp).to.be.undefined;
        } catch (error) {
          const isOnboardingError = error instanceof OnboardingError;
          expect(isOnboardingError).to.be.true;
          const e = error as OnboardingError;
          expect(e.msg).to.equal(errorExpectation?.msg);
          expect(e.error).to.equal(errorExpectation?.err);
        }
      });
    }
  );

  VALID_LINK_ENTITIES.forEach(({ scenario, linkedEntities }) => {
    it(`should succeed when ${scenario}`, async () => {
      const request = onboardingRequest(linkedEntities);
      const resp = await ValidationWrapper.parseRequest(request, LOG_STUB);

      const entities = linkedEntities?.getEntities();
      expect(resp.entity).to.equal(entities?.getEntity());
      expect(resp.data).to.be.equal(request);

      switch (linkedEntities?.getTargetCase()) {
        case LinkEntities.TargetCase.SCHOOL: {
          const schoolExternalId = linkedEntities
            ?.getSchool()
            ?.getExternalUuid();
          expect(resp.entityId).to.equal(schoolExternalId);
          identifiers(entities, schoolExternalId).forEach((i) => {
            expect(schoolStub.calledWith(i, LOG_STUB)).to.be.true;
          });
          break;
        }
        case LinkEntities.TargetCase.ORGANIZATION: {
          const orgExternalId = linkedEntities
            ?.getOrganization()
            ?.getExternalUuid();
          expect(resp.entityId).to.equal(orgExternalId);
          identifiers(entities, orgExternalId).forEach((i) => {
            expect(organizationStub.calledWith(i, LOG_STUB)).to.be.true;
          });
          break;
        }
        case LinkEntities.TargetCase.CLASS: {
          const classExternalId = linkedEntities?.getClass()?.getExternalUuid();
          expect(resp.entityId).to.equal(classExternalId);
          identifiers(entities, classExternalId).forEach((i) => {
            expect(classStub.calledWith(i, LOG_STUB)).to.be.true;
          });
          break;
        }
        case LinkEntities.TargetCase.USER: {
          const userExternalId = linkedEntities?.getUser()?.getExternalUuid();
          expect(resp.entityId).to.equal(userExternalId);
          identifiers(entities, userExternalId).forEach((i) => {
            expect(userStub.calledWith(i, LOG_STUB)).to.be.true;
          });
          break;
        }
      }
    });
  });
});

function entitiesToLink(type: Entity, identifiers: string[]): EntitiesToLink {
  const entitiesToLink = new EntitiesToLink();
  entitiesToLink.setEntity(type);
  entitiesToLink.setExternalEntityIdentifiersList(identifiers);
  return entitiesToLink;
}

function organization(externalId = uuidv4()): Organization {
  const organization = new Organization();
  organization.setExternalUuid(externalId);
  return organization;
}

function linkedEntities(): LinkEntities {
  return new LinkEntities();
}

function identifiers(
  entities: EntitiesToLink | undefined,
  externalId?: string
): string[] {
  const identifiers = entities?.getExternalEntityIdentifiersList() ?? [];
  identifiers.unshift(externalId ?? '');

  return identifiers;
}
