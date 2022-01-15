import { Logger } from 'pino';

import { Entity, ExternalUuid, Uuid } from '../..';
import {
  BAD_REQUEST,
  BASE_PATH,
  Category,
  MachineError,
  OnboardingError,
  Props,
  tryGetMember,
} from '../errors';
import {
  EntitiesToLink,
  LinkEntities,
  OnboardingRequest,
  Entity as PbEntity,
} from '../protos/api_pb';
import { Context } from '../utils/context';

export type LinkEntitiesRequest = {
  primary: LinkEntity;
  secondary: LinkEntity;
};

export type LinkEntity = {
  entity: Entity;
  identifier: string | Uuid;
};

export async function parseLinkEntities(
  req: OnboardingRequest,
  log: Logger,
  props: Props
): Promise<Logger> {
  const path = [...BASE_PATH];
  const payload = req.getPayloadCase();
  if (payload !== OnboardingRequest.PayloadCase.LINK_ENTITIES)
    throw BAD_REQUEST(
      `If Action is of type 'LINK', payload must be 'LinkEntites'`,
      path,
      log,
      props
    );

  path.push('linkEntities');
  const body = tryGetMember(req.getLinkEntities(), log, path);
  const { targetEntity, targetEntityId } = await parseTargetEntity(
    body,
    log,
    path
  );

  props['targetEntity'] = targetEntity;
  props['targetEntityId'] = targetEntityId;

  const childPath = [...path, 'entities'];
  const { childEntites, childIds } = await parseEntitiesToLink(
    body.getExternalOrganizationUuid(),
    tryGetMember(body.getEntities(), log, childPath),
    log,
    childPath
  );

  props['entityToLink'] = childEntites;
  props['entityIdsToLink'] = childIds;

  return log.child(props);
}

async function parseTargetEntity(
  body: LinkEntities,
  log: Logger,
  path: string[]
): Promise<{
  targetEntity: Entity;
  targetEntityId: ExternalUuid;
}> {
  let targetEntity: Entity;
  let targetEntityId: ExternalUuid;
  const ctx = Context.getInstance();
  switch (body.getTargetCase()) {
    case LinkEntities.TargetCase.ORGANIZATION: {
      targetEntity = Entity.ORGANIZATION;
      targetEntityId = tryGetMember(body.getOrganization(), log, [
        ...path,
        'organization',
      ]).getExternalUuid();
      await ctx.organizationIdIsValid(targetEntityId, log);
      if (body.getExternalOrganizationUuid() !== targetEntity)
        throw new OnboardingError(
          MachineError.REQUEST,
          `Found that the Organization ID provided and the entity identifier provided did not match despite the entity being set to 'ORGANIZATION'`,
          Category.REQUEST,
          log,
          path
        );
      break;
    }
    case LinkEntities.TargetCase.SCHOOL: {
      targetEntity = Entity.SCHOOL;
      targetEntityId = tryGetMember(body.getSchool(), log, [
        ...path,
        'school',
      ]).getExternalUuid();
      await ctx.schoolIdIsValid(targetEntityId, log);
      break;
    }
    case LinkEntities.TargetCase.CLASS: {
      targetEntity = Entity.CLASS;
      targetEntityId = tryGetMember(body.getClass(), log, [
        ...path,
        'class',
      ]).getExternalUuid();
      await ctx.classIdIsValid(targetEntityId, log);
      break;
    }
    case LinkEntities.TargetCase.USER: {
      targetEntity = Entity.USER;
      targetEntityId = tryGetMember(body.getUser(), log, [
        ...path,
        'user',
      ]).getExternalUuid();
      await ctx.userIdIsValid(targetEntityId, log);
      break;
    }
    default:
      throw BAD_REQUEST(
        `A request to LinkEntites must include either an 'ORGANIZATION',
        'SCHOOL', 'CLASS' or 'USER'`,
        path,
        log
      );
  }
  return { targetEntity, targetEntityId };
}

async function parseEntitiesToLink(
  orgId: ExternalUuid,
  body: EntitiesToLink,
  log: Logger,
  path: string[]
): Promise<{
  childEntites: Entity;
  childIds: ExternalUuid[];
}> {
  const { externalEntityIdentifiersList, entity } = body.toObject();
  const ctx = Context.getInstance();
  let e: Entity;
  switch (entity) {
    case PbEntity.ORGANIZATION: {
      // @TODO - Create Find Many Queries
      for (const id of externalEntityIdentifiersList) {
        await ctx.organizationIdIsValid(id, log);
      }
      e = Entity.ORGANIZATION;
      break;
    }
    case PbEntity.SCHOOL: {
      // @TODO - Create Find Many Queries
      for (const id of externalEntityIdentifiersList) {
        await ctx.schoolIdIsValid(id, log);
      }
      e = Entity.SCHOOL;
      break;
    }
    case PbEntity.CLASS: {
      // @TODO - Create Find Many Queries
      for (const id of externalEntityIdentifiersList) {
        await ctx.classIdIsValid(id, log);
      }
      e = Entity.CLASS;
      break;
    }
    case PbEntity.USER: {
      // @TODO - Create Find Many Queries
      for (const id of externalEntityIdentifiersList) {
        await ctx.userIdIsValid(id, log);
      }
      e = Entity.USER;
      break;
    }
    case PbEntity.PROGRAM: {
      await ctx.programsAreValid(externalEntityIdentifiersList, orgId, log);
      e = Entity.PROGRAM;
      break;
    }
    case PbEntity.ROLE: {
      await ctx.rolesAreValid(externalEntityIdentifiersList, orgId, log);
      e = Entity.ROLE;
      break;
    }
    default:
      throw BAD_REQUEST(
        `'ENTITY' must be set when trying to link entities`,
        path,
        log
      );
  }
  return {
    childEntites: e,
    childIds: externalEntityIdentifiersList,
  };
}
