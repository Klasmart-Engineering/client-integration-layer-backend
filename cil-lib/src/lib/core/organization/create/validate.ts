import Joi from 'joi';
import { Logger } from 'pino';

import { JOI_VALIDATION_SETTINGS, VALIDATION_RULES } from '../../../..';
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
        .setEntity(PbEntity.ORGANIZATION)
        .setEntityId(d.protobuf.getExternalUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { protobuf: protobuf } = r;

  const entity = protobuf.toObject();
  const newLogger = log.child({
    entityId: entity.externalUuid,
    name: entity.name,
    entity: Entity.ORGANIZATION,
  });
  schemaValidation(entity, newLogger);
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

export const organizationSchema = Joi.object({
  name: Joi.string()
    .min(VALIDATION_RULES.ORGANIZATION_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.ORGANIZATION_NAME_MAX_LENGTH)
    .required(),

  externalUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),
});
