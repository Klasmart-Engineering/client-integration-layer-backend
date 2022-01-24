import { Logger } from 'pino';

import { Entity } from '../..';
import { BAD_REQUEST, BASE_PATH, tryGetMember } from '../errors';
import { Action, Link, OnboardingRequest } from '../protos';

type Metadata = {
  entity: Entity;
  identifier: string;
  action: Action;
};

export function parseOnboardingRequestForMetadata(
  r: OnboardingRequest,
  log: Logger
): Metadata {
  let entity = Entity.UNKNOWN;
  let identifier: string | undefined = 'UNKNOWN';
  const action = r.getAction();
  switch (r.getPayloadCase()) {
    case OnboardingRequest.PayloadCase.ORGANIZATION: {
      entity = Entity.ORGANIZATION;
      identifier = r.getOrganization()?.getExternalUuid();
      break;
    }
    case OnboardingRequest.PayloadCase.SCHOOL: {
      entity = Entity.SCHOOL;
      identifier = r.getOrganization()?.getExternalUuid();
      break;
    }
    case OnboardingRequest.PayloadCase.CLASS: {
      entity = Entity.CLASS;
      identifier = r.getOrganization()?.getExternalUuid();
      break;
    }
    case OnboardingRequest.PayloadCase.USER: {
      entity = Entity.USER;
      identifier = r.getOrganization()?.getExternalUuid();
      break;
    }
    case OnboardingRequest.PayloadCase.LINK_ENTITIES: {
      const payload = tryGetMember(r.getLinkEntities(), log);
      switch (payload.getLinkCase()) {
        case Link.LinkCase.ADD_USERS_TO_ORGANIZATION: {
          entity = Entity.ORGANIZATION;
          identifier = payload
            .getAddUsersToOrganization()
            ?.getExternalOrganizationUuid();
          break;
        }
        case Link.LinkCase.ADD_ORGANIZATION_ROLES_TO_USER: {
          entity = Entity.ORGANIZATION;
          identifier = payload
            .getAddOrganizationRolesToUser()
            ?.getExternalOrganizationUuid();
          break;
        }
        case Link.LinkCase.ADD_USERS_TO_SCHOOL: {
          entity = Entity.SCHOOL;
          identifier = payload.getAddUsersToSchool()?.getExternalSchoolUuid();
          break;
        }
        case Link.LinkCase.ADD_CLASSES_TO_SCHOOL: {
          entity = Entity.SCHOOL;
          identifier = payload.getAddClassesToSchool()?.getExternalSchoolUuid();
          break;
        }
        case Link.LinkCase.ADD_PROGRAMS_TO_SCHOOL: {
          entity = Entity.SCHOOL;
          identifier = payload
            .getAddProgramsToSchool()
            ?.getExternalSchoolUuid();
          break;
        }
        case Link.LinkCase.ADD_PROGRAMS_TO_CLASS: {
          entity = Entity.CLASS;
          identifier = payload.getAddProgramsToClass()?.getExternalClassUuid();
          break;
        }
        case Link.LinkCase.ADD_USERS_TO_CLASS: {
          entity = Entity.CLASS;
          identifier = payload.getAddUsersToClass()?.getExternalClassUuid();
          break;
        }
        default:
          throw BAD_REQUEST(
            `A 'Link' request must provide one of the specified payloads`,
            [...BASE_PATH, 'linkEntities'],
            log
          );
      }
    }
  }
  return { entity, identifier: identifier || 'UNKNOWN', action };
}
