import Joi from 'joi';
import { Logger } from 'pino';

import { Context, Link } from '../../..';
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
  const validRequests = [];
  let invalidRequests: Response[] = [];
  for (const d of data) {
    try {
      const { valid, invalid } = await validate(d, log);
      if (valid !== null) validRequests.push(valid);
      invalidRequests = invalidRequests.concat(invalid);
    } catch (error) {
      const e = convertErrorToProtobuf(error, log);

      if (d.protobuf.getExternalUserUuidsList()?.length == 0) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.USER)
          .setErrors(e);
        invalidRequests.push(resp);
      }

      for (const userId of d.protobuf.getExternalUserUuidsList()) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.USER)
          .setEntityId(userId)
          .setErrors(e);
        invalidRequests.push(resp);
      }
    }
  }
  return [{ valid: validRequests, invalid: invalidRequests }, log];
}

async function validate(
  r: IncomingData,
  log: Logger
): Promise<{ valid: IncomingData | null; invalid: Response[] }> {
  const { protobuf } = r;

  schemaValidation(protobuf.toObject(), log);
  const orgId = protobuf.getExternalOrganizationUuid();

  const invalidResponses = [];

  const ctx = await Context.getInstance();
  let validIdsToCheck = []; // valid ids for already linked check
  // Check the target organization is valid
  await ctx.organizationIdIsValid(orgId, log);

  // Check the target users are valid
  {
    const { valid, invalid } = await ctx.getUserIds(
      protobuf.getExternalUserUuidsList(),
      log
    );

    for (const id of invalid) {
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(r.requestId))
        .setEntity(PbEntity.USER)
        .setEntityId(id)
        .setErrors(
          new PbError().setEntityDoesNotExist(
            new EntityDoesNotExistError().setDetailsList([
              `Unable to find user with id ${id}`,
            ])
          )
        );
      invalidResponses.push(resp);
    }
    const validExistIds: IterableIterator<string> = valid.keys();
    validIdsToCheck = Array.from(validExistIds);
    protobuf.setExternalUserUuidsList(validIdsToCheck);
    r.data.externalUserUuidsList = validIdsToCheck;
  }

  // Check that Users don't already belong to Organization
  {
    const { valid: invalid, invalid: valid } =
      await Link.usersBelongToOrganization(validIdsToCheck, orgId, log);
    for (const id of invalid) {
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(r.requestId))
        .setEntity(PbEntity.USER)
        .setEntityId(id)
        .setErrors(
          new OnboardingError(
            MachineError.ENTITY_ALREADY_EXISTS,
            `User: ${id} already belongs to Organization: ${orgId}`,
            Category.REQUEST,
            log
          ).toProtobufError()
        );
      invalidResponses.push(resp);
    }

    // Re-make the initial request with only the valid users
    protobuf.setExternalUserUuidsList(valid);
    r.data.externalUserUuidsList = valid;
  }

  // Check the roles are valid
  await ctx.rolesAreValid(protobuf.getRoleIdentifiersList(), orgId, log);

  const valid = r.data.externalUserUuidsList.length === 0 ? null : r;
  return { valid, invalid: invalidResponses };
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
