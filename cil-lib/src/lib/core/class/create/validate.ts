import Joi from 'joi';
import { Logger } from 'pino';

import { Context } from '../../../..';
import {
  BASE_PATH,
  Category,
  convertErrorToProtobuf,
  ENTITY_ALREADY_EXISTS,
  Errors,
  MachineError,
  OnboardingError,
} from '../../../errors';
import {
  Class as PbClass,
  Entity as PbEntity,
  Response,
} from '../../../protos';
import { Entity as AppEntity } from '../../../types';
import {
  JOI_VALIDATION_SETTINGS,
  VALIDATION_RULES,
} from '../../../utils/validationRules';
import { requestIdToProtobuf } from '../../batchRequest';
import { Result } from '../../process';

import { IncomingData } from '.';

export async function validateMany(
  data: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const valid = [];
  const invalid = [];
  for (const d of data) {
    try {
      valid.push(await validate(d, log));
    } catch (error) {
      const e = convertErrorToProtobuf(error, log);
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(d.requestId))
        .setEntity(PbEntity.CLASS)
        .setEntityId(d.protobuf.getExternalUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { protobuf } = r;

  const entity = protobuf.toObject();
  const logger = log.child({
    organizationId: entity.externalOrganizationUuid,
    entityId: entity.externalUuid,
    name: entity.name,
  });
  schemaValidation(entity, logger);
  await entityValidation(entity, logger);
  return r;
}

function schemaValidation(entity: PbClass.AsObject, log: Logger): void {
  const errors = new Map();
  const { error } = classSchema.validate(entity, JOI_VALIDATION_SETTINGS);

  if (error) {
    for (const { path: p, message } of error.details) {
      const e =
        errors.get(p) ||
        new OnboardingError(
          MachineError.VALIDATION,
          `${AppEntity.CLASS} failed validation`,
          Category.REQUEST,
          log,
          [...BASE_PATH, 'class', ...p.map(toString)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

async function entityValidation(
  e: PbClass.AsObject,
  log: Logger
): Promise<void> {
  const ctx = Context.getInstance();
  let alreadyExists = false;
  try {
    await ctx.getClassId(e.externalUuid, log, false);
    // If the class already exists, then we want to error and not add it
    alreadyExists = true;
  } catch (_) {
    /* if the class id is NOT valid, then we want to add it */
  }
  if (alreadyExists)
    throw ENTITY_ALREADY_EXISTS(e.externalUuid, AppEntity.CLASS, log);
  await ctx.organizationIdIsValid(e.externalOrganizationUuid, log);
  await ctx.getSchoolId(e.externalSchoolUuid, log);
}

export const classSchema = Joi.object({
  externalUuid: Joi.string().guid({ version: ['uuidv4'] }),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  name: Joi.string()
    .min(VALIDATION_RULES.CLASS_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.CLASS_NAME_MAX_LENGTH)
    .required(),

  externalSchoolUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),
});
