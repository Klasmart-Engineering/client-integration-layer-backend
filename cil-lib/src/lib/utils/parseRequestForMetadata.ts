import { Entity } from '../..';
import { Action, LinkEntities, OnboardingRequest } from '../protos';

type Metadata = {
  entity: Entity;
  identifier: string;
  action: Action;
};

export function parseOnboardingRequestForMetadata(
  r: OnboardingRequest
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
      const linkEntities = r.getLinkEntities();
      switch (linkEntities?.getTargetCase()) {
        case LinkEntities.TargetCase.ORGANIZATION: {
          entity = Entity.ORGANIZATION;
          identifier = linkEntities.getOrganization()?.getExternalUuid();
          break;
        }
        case LinkEntities.TargetCase.SCHOOL: {
          entity = Entity.SCHOOL;
          identifier = linkEntities.getSchool()?.getExternalUuid();
          break;
        }
        case LinkEntities.TargetCase.CLASS: {
          entity = Entity.CLASS;
          identifier = linkEntities.getClass()?.getExternalUuid();
          break;
        }
        case LinkEntities.TargetCase.USER: {
          entity = Entity.USER;
          identifier = linkEntities.getUser()?.getExternalUuid();
          break;
        }
      }
      break;
    }
  }
  return { entity, identifier: identifier || 'UNKNOWN', action };
}
