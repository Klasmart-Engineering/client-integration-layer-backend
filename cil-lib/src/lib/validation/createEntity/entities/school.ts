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
import { Entity, School as PbSchool } from '../../../protos';
import { Entity as AppEntity } from '../../../types';
import { Context } from '../../../utils/context';
import {
  JOI_VALIDATION_SETTINGS,
  VALIDATION_RULES,
} from '../../validationRules';

export class ValidatedSchool {
  public static entity = Entity.SCHOOL;

  private constructor(
    public readonly school: PbSchool,
    public logger: Logger
  ) {}

  public static async fromRequest(
    req: PbSchool,
    logger: Logger,
    path: string[],
    props: Props
  ): Promise<ValidatedSchool> {
    const log = logger.child({
      ...props,
      entity: this.entity,
    });
    const entity = req.toObject();
    ValidatedSchool.schemaValidation(entity, log, path, props);
    const newLogger = log.child({
      organizationId: entity.externalOrganizationUuid,
      entityId: entity.externalUuid,
      name: entity.name,
    });
    await ValidatedSchool.entityValidation(entity, newLogger);
    return new ValidatedSchool(req, newLogger);
  }

  private static schemaValidation(
    entity: PbSchool.AsObject,
    log: Logger,
    path: string[],
    props: Props
  ): void {
    const errors = new Map();
    const { error } = schoolSchema.validate(entity, JOI_VALIDATION_SETTINGS);
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
    if (errors.size > 0) throw new Errors(Array.from(errors.values()));
  }

  private static async entityValidation(
    e: PbSchool.AsObject,
    log: Logger
  ): Promise<void> {
    const ctx = Context.getInstance();
    let alreadyExists = false;
    try {
      await ctx.schoolIdIsValid(e.externalUuid, log);
      alreadyExists = true;
    } catch (_) {
      /* if the school id is NOT valid, then we want to add it */
    }
    if (alreadyExists)
      throw ENTITY_ALREADY_EXISTS(e.externalUuid, AppEntity.SCHOOL, log);
    await ctx.organizationIdIsValid(e.externalOrganizationUuid, log);
  }
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
