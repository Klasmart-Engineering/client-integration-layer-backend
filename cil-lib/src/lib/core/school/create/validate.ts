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
  Entity as PbEntity,
  School as PbSchool,
  Response,
} from '../../../protos';
import { Entity } from '../../../types';
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
        .setEntity(PbEntity.SCHOOL)
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
  const newLogger = log.child({
    organizationId: entity.externalOrganizationUuid,
    entityId: entity.externalUuid,
    name: entity.name,
    entity: Entity.SCHOOL,
  });
  schemaValidation(entity, log);
  await entityValidation(entity, newLogger);
  return r;
}

function schemaValidation(entity: PbSchool.AsObject, log: Logger): void {
  const errors = new Map();
  const { error } = schoolSchema.validate(entity, JOI_VALIDATION_SETTINGS);
  if (error) {
    for (const { path: p, message } of error.details) {
      const e =
        errors.get(p) ||
        new OnboardingError(
          MachineError.VALIDATION,
          `${Entity.SCHOOL} failed validation`,
          Category.REQUEST,
          log,
          [...BASE_PATH, 'school', ...p.map(toString)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

async function entityValidation(
  e: PbSchool.AsObject,
  log: Logger
): Promise<void> {
  const ctx = Context.getInstance();
  let alreadyExists = false;
  try {
    await ctx.getSchoolId(e.externalUuid, log, false);
    alreadyExists = true;
  } catch (_) {
    /* if the school id is NOT valid, then we want to add it */
  }
  if (alreadyExists)
    throw ENTITY_ALREADY_EXISTS(e.externalUuid, Entity.SCHOOL, log);
  await ctx.organizationIdIsValid(e.externalOrganizationUuid, log);
}

export const schoolSchema = Joi.object({
  externalUuid: Joi.string().guid({ version: ['uuidv4'] }),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  name: Joi.string()
    .min(VALIDATION_RULES.SCHOOL_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.SCHOOL_NAME_MAX_LENGTH)
    .required(),

  shortCode: Joi.string()
    .min(VALIDATION_RULES.SHORTCODE_MIN_LENGTH)
    .max(VALIDATION_RULES.SHORTCODE_MAX_LENGTH)
    .required(),
});
