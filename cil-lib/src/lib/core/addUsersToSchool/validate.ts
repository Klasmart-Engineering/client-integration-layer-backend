import Joi from 'joi';
import { Logger } from 'pino';

import {
  Context,
  Entity,
  ExternalUuid,
  JOI_VALIDATION_SETTINGS,
  Link,
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
  AddUsersToSchool,
  EntityDoesNotExistError,
  Entity as PbEntity,
  Error as PbError,
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
      const users = d.protobuf.getExternalUserUuidsList();
      if (users.length === 0) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.SCHOOL)
          .setEntityId(d.protobuf.getExternalSchoolUuid())
          .setErrors(e);
        invalid.push(resp);
      }
      for (const userId of users) {
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
  const schoolId = protobuf.getExternalSchoolUuid();

  const ctx = Context.getInstance();
  const userIds = protobuf.getExternalUserUuidsList();
  // check the target users are valid
  const { valid, invalid } = await ctx.getUserIds(userIds, log);

  // Re-make the initial request with only the valid users
  protobuf.setExternalUserUuidsList(Array.from(valid.keys()));
  r.data.externalUserUuidsList = Array.from(valid.keys());

  // Checking that the school ID is valid is covered by this
  await Link.shareTheSameOrganization(log, [schoolId], undefined, userIds);
  return { valid: r, invalid };
}

function schemaValidation(
  entity: AddUsersToSchool.AsObject,
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
          [...BASE_PATH, 'addUsersToSchool', ...p.map((s) => `${s}`)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

export const schema = Joi.object({
  externalSchoolUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  externalUserUuidsList: Joi.array()
    .min(1)
    .items(Joi.string().guid({ version: ['uuidv4'] }))
    .required(),
});
