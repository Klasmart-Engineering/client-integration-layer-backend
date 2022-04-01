import Joi from 'joi';
import { Logger } from 'pino';

import {
  Context,
  JOI_VALIDATION_SETTINGS,
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
import { Entity as PbEntity, User as PbUser, Response } from '../../../protos';
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
        .setEntity(PbEntity.USER)
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
    entityId: entity.externalUuid,
    entity: Entity.USER,
  });
  schemaValidation(entity, log);
  await entityValidation(entity, newLogger);
  return r;
}

function schemaValidation(entity: PbUser.AsObject, log: Logger): void {
  const errors = new Map();
  const { error } = userSchema.validate(entity, JOI_VALIDATION_SETTINGS);
  if (error) {
    for (const { path: p, message } of error.details) {
      const e =
        errors.get(p) ||
        new OnboardingError(
          MachineError.VALIDATION,
          `${Entity.USER} failed validation`,
          Category.REQUEST,
          log,
          [...BASE_PATH, 'user', ...p.map((s) => `${s}`)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }

  const { email, phone, username } = entity;
  const phoneRegex = new RegExp(VALIDATION_RULES.PHONE_REGEX);
  const emailRegex = new RegExp(VALIDATION_RULES.EMAIL_REGEX);
  const phoneIsValid = phoneRegex.exec(phone);
  const emailIsValid = emailRegex.exec(email);

  if (email.length === 0 && phone.length === 0 && username.length === 0) {
    errors.set(
      'phone',
      new OnboardingError(
        MachineError.VALIDATION,
        `${Entity.USER} failed validation`,
        Category.REQUEST,
        log,
        [...BASE_PATH, 'user', '[email | phone | username ]'],
        {},
        [
          'Missing Phone, Email and Username must provide at least one of these values',
        ]
      )
    );
  }

  if (email.length > 0 && emailIsValid === null) {
    errors.set(
      'email',
      new OnboardingError(
        MachineError.VALIDATION,
        `${Entity.USER} failed validation`,
        Category.REQUEST,
        log,
        [...BASE_PATH, 'user', '[email]'],
        {},
        ['Email is invalid']
      )
    );
  }

  if (phone.length > 0 && phoneIsValid === null) {
    errors.set(
      'phone',
      new OnboardingError(
        MachineError.VALIDATION,
        `${Entity.USER} failed validation`,
        Category.REQUEST,
        log,
        [...BASE_PATH, 'user', '[phone]'],
        {},
        ['phone is invalid']
      )
    );
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

async function entityValidation(
  request: PbUser.AsObject,
  log: Logger
): Promise<string[]> {
  const ctx = await Context.getInstance();
  await ctx.userDoesNotExist(request.externalUuid, log);

  // If the user does not exist then we validate the external org id & role names.
  const organizationUuid = request.externalOrganizationUuid;
  const roleNames = new Set(request.roleIdentifiersList);

  await ctx.organizationIdIsValid(organizationUuid, log);

  const roles = await ctx.rolesAreValid(
    Array.from(roleNames),
    organizationUuid,
    log
  );
  // Returning the kidsloop role id, as in the future these would be required for the streams.
  return roles.map((role) => role.id);
}

export const userSchema = Joi.object({
  externalUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  givenName: Joi.string()
    .min(VALIDATION_RULES.USER_GIVEN_FAMILY_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.USER_GIVEN_FAMILY_NAME_MAX_LENGTH)
    .regex(VALIDATION_RULES.ALPHANUMERIC)
    .required(),

  familyName: Joi.string()
    .min(VALIDATION_RULES.USER_GIVEN_FAMILY_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.USER_GIVEN_FAMILY_NAME_MAX_LENGTH)
    .regex(VALIDATION_RULES.ALPHANUMERIC)
    .required(),

  username: Joi.string()
    .allow('')
    .max(VALIDATION_RULES.USERNAME_MAX_LENGTH)
    .alphanum()
    .required(),

  email: Joi.any(),
  phone: Joi.any(),

  dateOfBirth: Joi.string().allow('').regex(VALIDATION_RULES.DOB_REGEX),

  // 1 = Male, 2 = Female
  gender: Joi.number().min(1).max(2).required(),

  shortCode: Joi.string()
    .allow('')
    .max(VALIDATION_RULES.SHORTCODE_MAX_LENGTH)
    .alphanum(),

  roleIdentifiersList: Joi.array()
    .min(1)
    .items(
      Joi.string().min(1).max(VALIDATION_RULES.ROLE_NAME_MAX_LENGTH).required()
    )
    .required(),
});
