import Joi from 'joi';
import { Logger } from 'pino';

import {
  Category,
  ENTITY_ALREADY_EXISTS,
  Errors,
  MachineError,
  OnboardingError,
  Props,
} from '../../../errors';
import { Entity, User as PbUser } from '../../../protos';
import { Entity as AppEntity } from '../../../types';
import { Context } from '../../../utils/context';
import {
  JOI_VALIDATION_SETTINGS,
  VALIDATION_RULES,
} from '../../validationRules';

export class ValidatedUser {
  public static entity = Entity.USER;

  private constructor(public readonly user: PbUser, public logger: Logger) {}

  public static async fromRequest(
    req: PbUser,
    logger: Logger,
    path: string[],
    props: Props
  ): Promise<ValidatedUser> {
    const log = logger.child({
      ...props,
      entity: this.entity,
    });
    const entity = req.toObject();
    ValidatedUser.schemaValidation(entity, log, path, props);
    const newLogger = log.child({
      entityId: entity.externalUuid,
    });
    await ValidatedUser.entityValidation(entity, newLogger);
    return new ValidatedUser(req, newLogger);
  }

  private static schemaValidation(
    entity: PbUser.AsObject,
    log: Logger,
    path: string[],
    props: Props
  ): void {
    const errors = new Map();
    const { error } = userSchema.validate(entity, JOI_VALIDATION_SETTINGS);
    if (error) {
      for (const { path: p, message } of error.details) {
        const e =
          errors.get(p) ||
          new OnboardingError(
            MachineError.VALIDATION,
            `${this.entity} failed validation`,
            Category.REQUEST,
            log,
            [...path, ...p.map(toString)],
            props
          );
        e.details.push(message);
        errors.set(p, e);
      }
    }
    // This is to validate the custom logic around requiring either
    // - USERNAME + PHONE
    // - USERNAME + EMAIL
    // (or both). This can't be handled by JOI
    const { email, phone } = entity;
    const phoneRegex = new RegExp(VALIDATION_RULES.PHONE_REGEX);
    const emailRegex = new RegExp(VALIDATION_RULES.EMAIL_REGEX);
    const phoneIsValid = phoneRegex.exec(phone);
    const emailIsValid = emailRegex.exec(email);
    if (phoneIsValid === null && emailIsValid === null) {
      errors.set(
        'phone',
        new OnboardingError(
          MachineError.VALIDATION,
          `${this.entity} failed validation`,
          Category.REQUEST,
          log,
          ['$', 'user', '[email | phone]'],
          {},
          [
            'Phone and Email are invalid, at least one of the two must be valid',
            `Must provide a combination of either 'PHONE' + 'USERNAME' or 'EMAIL' + 'USERNAME'`,
          ]
        )
      );
    }
    if (errors.size > 0) throw new Errors(Array.from(errors.values()));
  }

  private static async entityValidation(
    e: PbUser.AsObject,
    log: Logger
  ): Promise<void> {
    const ctx = Context.getInstance();
    let alreadyExists = false;
    try {
      await ctx.userIdIsValid(e.externalUuid, log);
      // If the user already exists, then we want to error and not add it
      alreadyExists = true;
    } catch (_) {
      /* if the user id is NOT valid, then we want to add it */
    }
    if (alreadyExists)
      throw ENTITY_ALREADY_EXISTS(e.externalUuid, AppEntity.USER, log);
    await ctx.organizationIdIsValid(e.externalOrganizationUuid, log);
    await ctx.schoolIdIsValid(e.externalSchoolUuid, log);
  }
}

export const userSchema = Joi.object({
  externalUuid: Joi.string().guid({ version: ['uuidv4'] }),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  externalSchoolUuid: Joi.string()
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
  .min(VALIDATION_RULES.USERNAME_MIN_LENGTH)
  .max(VALIDATION_RULES.USERNAME_MAX_LENGTH)
  .alphanum().required(),

  // Due to niche rules, need to validate in ValidationWrapper.validate
  email: Joi.any(),
  phone: Joi.any(),

  dateOfBirth: Joi.date().max('now'),

  // 0 = Male, 1 = Female
  gender: Joi.number().min(0).max(1).required(),
});
