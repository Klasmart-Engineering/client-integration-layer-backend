import Joi from 'joi';
import { Logger } from 'pino';

import { Context } from '../../..';
import {
  BASE_PATH,
  Category,
  convertErrorToProtobuf,
  Errors,
  MachineError,
  OnboardingError,
} from '../../errors';
import {
  AddUsersToOrganization,
  EntityDoesNotExistError,
  Entity as PbEntity,
  Error as PbError,
  Response,
} from '../../protos';
import { Entity } from '../../types';
import { ExternalUuid } from '../../utils';
import {
  JOI_VALIDATION_SETTINGS,
  VALIDATION_RULES,
} from '../../utils/validationRules';
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
      const result = await validate(d, log);
      valid.push(result.valid);
      for (const i of result.invalid) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.USER)
          .setEntityId(i)
          .setErrors(
            new PbError().setEntityDoesNotExist(
              new EntityDoesNotExistError().setDetailsList([
                `Unable to find user with id ${i}`,
              ])
            )
          );
        invalid.push(resp);
      }
    } catch (error) {
      const e = convertErrorToProtobuf(error, log);

      if (d.protobuf.getExternalUserUuidsList()?.length == 0) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.USER)
          .setErrors(e);
        invalid.push(resp);
      }

      for (const userId of d.protobuf.getExternalUserUuidsList()) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.USER)
          .setEntityId(userId)
          .setErrors(e);
        invalid.push(resp);
      }
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(
  r: IncomingData,
  log: Logger
): Promise<{ valid: IncomingData; invalid: ExternalUuid[] }> {
  const { protobuf } = r;

  schemaValidation(protobuf.toObject(), log);
  const orgId = protobuf.getExternalOrganizationUuid();
  const ctx = Context.getInstance();
  // Check the target organization is valid
  await ctx.organizationIdIsValid(orgId, log);

  // Check the target users are valid
  // This is an all or nothing
  // @TODO - do we want to make this more lienient
  const { valid, invalid } = await ctx.getUserIds(
    protobuf.getExternalUserUuidsList(),
    log
  );

  // Re-make the initial request with only the valid users
  protobuf.setExternalUserUuidsList(Array.from(valid.keys()));
  r.data.externalUserUuidsList = Array.from(valid.keys());

  // Check the roles are valid
  await ctx.rolesAreValid(protobuf.getRoleIdentifiersList(), orgId, log);

  return { valid: r, invalid };
}

function schemaValidation(
  entity: AddUsersToOrganization.AsObject,
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
          `${Entity.ORGANIZATION} failed validation`,
          Category.REQUEST,
          log,
          [...BASE_PATH, 'addUsersToOrganization', ...p.map((s) => `${s}`)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

export const schema = Joi.object({
  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  externalUserUuidsList: Joi.array()
    .min(1)
    .items(Joi.string().guid({ version: ['uuidv4'] }))
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
