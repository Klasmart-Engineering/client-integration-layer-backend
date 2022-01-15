import Joi from 'joi';
import { Logger } from 'pino';

import {
  Category,
  MachineError,
  OnboardingError,
  Props,
} from '../../../errors';
import { Entity, School as PbSchool } from '../../../protos';
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
    const { error } = schoolSchema.validate(entity, JOI_VALIDATION_SETTINGS);
    if (error)
      throw new OnboardingError(
        MachineError.VALIDATION,
        `Create ${this.entity} request has failed validation`,
        Category.REQUEST,
        log,
        path,
        props,
        error.details.map((e) => e.message)
      );
  }

  private static async entityValidation(
    e: PbSchool.AsObject,
    log: Logger
  ): Promise<void> {
    const ctx = Context.getInstance();
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
