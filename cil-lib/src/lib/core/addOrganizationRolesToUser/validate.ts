import Joi from 'joi';
import { Logger } from 'pino';

import {
  Context,
  Entity,
  JOI_VALIDATION_SETTINGS,
  Link,
  VALIDATION_RULES,
} from '../../..';
import {
  BASE_PATH,
  Category,
  convertErrorToProtobuf,
  Errors,
  MachineError,
  OnboardingError,
} from '../../errors';
import {
  AddOrganizationRolesToUser,
  Entity as PbEntity,
  Response,
} from '../../protos';
import { requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

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
        .setEntity(PbEntity.USER)
        .setEntityId(d.protobuf.getExternalUserUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { protobuf } = r;
  schemaValidation(protobuf.toObject(), log);

  const userId = protobuf.getExternalUserUuid();
  const orgId = protobuf.getExternalOrganizationUuid();
  // Check that the user already exists in that organization
  await Link.userBelongsToOrganization(userId, orgId, log);

  const ctx = Context.getInstance();
  // Check that the roles are valid for that organization
  await ctx.rolesAreValid(protobuf.getRoleIdentifiersList(), orgId, log);

  return r;
}

function schemaValidation(
  entity: AddOrganizationRolesToUser.AsObject,
  log: Logger
): void {
  const errors = new Map();
  const { error } = schema.validate(entity, JOI_VALIDATION_SETTINGS);
  if (error) {
    for (const { path: p, message } of error.details) {
      const e =
        errors.get(p) ||
        new OnboardingError(
          MachineError.VALIDATION,
          `${Entity.USER} failed validation`,
          Category.REQUEST,
          log,
          [...BASE_PATH, 'addOrganizationRolesToUser', ...p.map((s) => `${s}`)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

export const schema = Joi.object({
  externalUserUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  roleIdentifiersList: Joi.array()
    .min(1)
    .items(
      Joi.string()
        .min(VALIDATION_RULES.ROLE_NAME_MIN_LENGTH)
        .max(VALIDATION_RULES.ROLE_NAME_MAX_LENGTH)
    )
    .required(),
});
