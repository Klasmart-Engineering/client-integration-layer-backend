import Joi from 'joi';
import { Logger } from 'pino';

import {
  Category,
  MachineError,
  OnboardingError,
  Props,
} from '../../../errors';
import { Entity, Class as PbClass } from '../../../protos';
import { Context } from '../../../utils/context';
import { JOI_VALIDATION_SETTINGS } from '../../validate';
import { VALIDATION_RULES } from '../../validationRules';

export class ValidatedClass {
  public static entity = Entity.CLASS;

  private constructor(public readonly cl: PbClass, public logger: Logger) {}

  public static async fromRequest(
    req: PbClass,
    logger: Logger,
    path: string[],
    props: Props
  ): Promise<ValidatedClass> {
    const log = logger.child({
      ...props,
      entity: this.entity,
    });
    const entity = req.toObject();
    ValidatedClass.schemaValidation(entity, log, path, props);
    const newLogger = log.child({
      organizationId: entity.externalOrganizationUuid,
      entityId: entity.externalUuid,
      name: entity.name,
    });
    await ValidatedClass.entityValidation(entity, newLogger);
    return new ValidatedClass(req, newLogger);
  }

  private static schemaValidation(
    entity: PbClass.AsObject,
    log: Logger,
    path: string[],
    props: Props
  ): void {
    const { error } = classSchema.validate(entity, JOI_VALIDATION_SETTINGS);
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
    e: PbClass.AsObject,
    log: Logger
  ): Promise<void> {
    const ctx = Context.getInstance();
    await ctx.organizationIdIsValid(e.externalOrganizationUuid, log);
  }
}

export const classSchema = Joi.object({
  externalUuid: Joi.string().guid({ version: ['uuidv4'] }),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  name: Joi.string()
    .min(VALIDATION_RULES.CLASS_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.CLASS_NAME_MAX_LENGTH)
    .required(),

  externalSchoolUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),
});
