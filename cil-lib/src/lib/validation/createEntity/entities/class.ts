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
import { Entity, Class as PbClass } from '../../../protos';
import { Entity as AppEntity } from '../../../types';
import { Context } from '../../../utils/context';
import {
  JOI_VALIDATION_SETTINGS,
  VALIDATION_RULES,
} from '../../validationRules';

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
    const errors = new Map();
    const { error } = classSchema.validate(entity, JOI_VALIDATION_SETTINGS);

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
    e: PbClass.AsObject,
    log: Logger
  ): Promise<void> {
    const ctx = Context.getInstance();
    let alreadyExists = false;
    try {
      await ctx.classIdIsValid(e.externalUuid, log);
      // If the class already exists, then we want to error and not add it
      alreadyExists = true;
    } catch (_) {
      /* if the class id is NOT valid, then we want to add it */
    }
    if (alreadyExists)
      throw ENTITY_ALREADY_EXISTS(e.externalUuid, AppEntity.CLASS, log);
    await ctx.organizationIdIsValid(e.externalOrganizationUuid, log);
    await ctx.schoolIdIsValid(e.externalSchoolUuid, log);
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
