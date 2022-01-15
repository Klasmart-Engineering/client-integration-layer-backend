import Joi from 'joi';
import { Logger } from 'pino';

import { Entity, Uuid } from '../..';
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
  EntityInformation,
  OnboardingRequest,
  Entity as PbEntity,
} from '../protos/api_pb';
import { protobufToEntity } from '../types/entity';

import { JOI_VALIDATION_SETTINGS } from './validationRules';

export type LinkEntitiesRequest = {
  primary: LinkEntity;
  secondary: LinkEntity;
};

export type LinkEntity = {
  entity: Entity;
  identifier: string | Uuid;
};

const PRIMARY_ENTITIES = Object.freeze(
  new Set([
    PbEntity.ORGANIZATION,
    PbEntity.SCHOOL,
    PbEntity.CLASS,
    PbEntity.USER,
  ])
);
const SECONDARY_ENTITIES = Object.freeze(
  new Set([PbEntity.ROLE, PbEntity.PROGRAM])
);

const entitySchema = Joi.object({
  entity: Joi.string().required(),
  identifier: Joi.string().min(3).required(),
});

const linkEntitiesSchema = Joi.object({
  primary: entitySchema,
  secondary: entitySchema,
});

const parsedRequestSchema = Joi.object({
  externalOrganizationUuid: Joi.string().guid({ version: ['uuidv4'] }),
  linkEntities: linkEntitiesSchema,
});

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
  const entities: EntityInformation[] = [
    tryGetMember(body.getEntity1(), log, [...path, 'entity1']),
    tryGetMember(body.getEntity2(), log, [...path, 'entity2']),
  ];

  const primary = entities.find((e) => PRIMARY_ENTITIES.has(e.getEntity()));
  if (!primary)
    throw BAD_REQUEST(
      `A request to LinkEntites must include either an 'ORGANIZATION',
        'SCHOOL', 'CLASS' or 'USER' as one of the two entities`,
      path,
      log
    );
  const primaryEntity: LinkEntity = {
    entity: protobufToEntity(primary.getEntity()),
    identifier: primary.getExternalEntityIdentifier(),
  };
  props['primaryEntity'] = primaryEntity.entity;
  props['primaryEntityId'] = primaryEntity.identifier;

  const secondary = entities.find((e) => SECONDARY_ENTITIES.has(e.getEntity()));
  if (!secondary)
    throw BAD_REQUEST(
      `A request to LinkEntites must include either a 'ROLE' or 'PROGRAM' as one of the two entities`,
      path,
      log
    );
  const secondaryEntity: LinkEntity = {
    entity: protobufToEntity(secondary.getEntity()),
    identifier: secondary.getExternalEntityIdentifier(),
  };
  props['secondaryEntity'] = secondaryEntity.entity;
  props['secondaryEntityId'] = secondaryEntity.identifier;

  const logger = log.child(props);

  const linkEntities = {
    primary: primaryEntity,
    secondary: secondaryEntity,
  };

  const parsed = {
    externalOrganizationUuid: body.getExternalOrganizationUuid(),
    linkEntities,
  };

  const { error } = parsedRequestSchema.validate(
    parsed,
    JOI_VALIDATION_SETTINGS
  );
  if (error)
    throw new OnboardingError(
      MachineError.VALIDATION,
      'Link Entities request has failed validation',
      Category.REQUEST,
      logger,
      path,
      props,
      error.details.map((e) => e.message)
    );

  // @TODO - Need to add UUID checking for programs and roles
  return logger;
}
