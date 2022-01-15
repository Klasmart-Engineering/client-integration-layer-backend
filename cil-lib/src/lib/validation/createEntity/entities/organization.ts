import Joi from 'joi';
import { Logger } from 'pino';

import { Organization } from '../../../entities';
import {
  Category,
  MachineError,
  OnboardingError,
  Props,
} from '../../../errors';
import { Entity, Organization as PbOrganization } from '../../../protos';
import { Context } from '../../../utils/context';
import { JOI_VALIDATION_SETTINGS } from '../../validate';
import { VALIDATION_RULES } from '../../validationRules';

export class ValidatedOrganization {
  public static entity = Entity.ORGANIZATION;

  private constructor(
    public readonly org: PbOrganization,
    public logger: Logger
  ) {}

  public static async fromRequest(
    req: PbOrganization,
    logger: Logger,
    path: string[],
    props: Props
  ): Promise<ValidatedOrganization> {
    const log = logger.child({
      ...props,
      entity: this.entity,
    });
    const entity = req.toObject();
    ValidatedOrganization.schemaValidation(entity, log, path, props);
    const newLogger = log.child({
      entityId: entity.externalUuid,
      name: entity.name,
    });
    await ValidatedOrganization.entityValidation(entity, newLogger);
    return new ValidatedOrganization(req, newLogger);
  }

  private static schemaValidation(
    entity: PbOrganization.AsObject,
    log: Logger,
    path: string[],
    props: Props
  ): void {
    const { error } = organizationSchema.validate(
      entity,
      JOI_VALIDATION_SETTINGS
    );
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
    e: PbOrganization.AsObject,
    log: Logger
  ): Promise<void> {
    try {
      const ctx = Context.getInstance();
      await ctx.organizationIdIsValid(e.externalUuid, log);
    } catch (_) {
      /* In this case we can try and fetch the organization*/
    }
    // If this errors, then looks like the organization is invalid
    // NOTE: There are a lot of moving parts in this.. can we revisit for better
    // error handling?
    await Organization.initializeOrganization(e, log);
  }
}

export const organizationSchema = Joi.object({
  name: Joi.string()
    .min(VALIDATION_RULES.ORGANIZATION_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.ORGANIZATION_NAME_MAX_LENGTH)
    .required(),

  externalUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),
});
