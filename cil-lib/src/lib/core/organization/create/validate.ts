import Joi from 'joi';
import { Logger } from 'pino';

import {
  Context,
  JOI_VALIDATION_SETTINGS,
  Organization,
  VALIDATION_RULES,
} from '../../../..';
import {
  BASE_PATH,
  Category,
  convertErrorToProtobuf,
  Errors,
  MachineError,
  OnboardingError,
} from '../../../errors';
import {
  Entity as PbEntity,
  Organization as PbOrganization,
  Response,
} from '../../../protos';
import { Entity } from '../../../types';
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
        .setRequestId(d.requestId)
        .setEntity(PbEntity.ORGANIZATION)
        .setEntityId(d.inner.getExternalUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { inner } = r;

  const entity = inner.toObject();
  const newLogger = log.child({
    entityId: entity.externalUuid,
    name: entity.name,
    entity: Entity.ORGANIZATION,
  });
  schemaValidation(entity, log);
  await entityValidation(entity, newLogger);
  return r;
}

function schemaValidation(entity: PbOrganization.AsObject, log: Logger): void {
  const errors = new Map();
  const { error } = organizationSchema.validate(
    entity,
    JOI_VALIDATION_SETTINGS
  );
  if (error) {
    for (const { path: p, message } of error.details) {
      const e =
        errors.get(p) ||
        new OnboardingError(
          MachineError.VALIDATION,
          `${Entity.ORGANIZATION} failed validation`,
          Category.REQUEST,
          log,
          [...BASE_PATH, 'organization', ...p.map((p) => p.toString())]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

async function entityValidation(
  e: PbOrganization.AsObject,
  log: Logger
): Promise<void> {
  try {
    const ctx = Context.getInstance();
    // Organizations should already exist
    await ctx.organizationIdIsValid(e.externalUuid, log);
  } catch (_) {
    /* In this case we can try and fetch the organization*/
  }
  // If this errors, then looks like the organization is invalid
  // NOTE: There are a lot of moving parts in this.. can we revisit for better
  // error handling?
  await Organization.initializeOrganization(e, log);
}

export const organizationSchema = Joi.object({
  name: Joi.string()
    .min(VALIDATION_RULES.ORGANIZATION_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.ORGANIZATION_NAME_MAX_LENGTH)
    .required(),

  externalUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),
});
