import { Logger } from 'pino';

import { Entity, ExternalUuid, log } from '..';

import {
  EntityAlreadyExistsError,
  EntityDoesNotExistError,
  InternalServerError,
  InvalidRequestError,
  PathBasedError,
  Error as PbError,
  ValidationError,
} from './protos';

export const BASE_PATH = Object.freeze(['$']);

export enum Category {
  REQUEST = 'REQUEST',
  APP = 'APPLICATION',
  REDIS = 'REDIS',
  POSTGRES = 'POSTGRES',
  ADMIN_SERVICE = 'ADMIN SERVICE',
  UNKNOWN = 'UNKNOWN',
  PROTOBUF = 'PROTOBUF',
}

export enum MachineError {
  VALIDATION = 'validation',
  ENTITY_ALREADY_EXISTS = 'entity already exists',
  ENTITY_DOES_NOT_EXIST = 'entity does not exist',
  UNREACHABLE_CODE = 'unreachable',
  READ = 'read operation',
  WRITE = 'write operation',
  STREAM = 'data stream',
  APP_CONFIG = 'application configuration',
  SERDE = 'serde',
  NETWORK = 'network',
  NOT_FOUND = 'not found',
  REQUEST = 'bad request',
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export type Props = Record<string, string | string[] | number | boolean>;

export class Errors {
  constructor(public errors: OnboardingError[]) {}

  // @TODO - Rework this, it's pretty gnarly
  public toProtobufError(): PbError {
    const e = new PbError();
    const validationErrors = [];
    let entityAlreadyExists = null;
    let entityDoesntExists = null;
    let other = null;
    for (const err of this.errors) {
      switch (err.error) {
        case MachineError.VALIDATION: {
          const pathBased = new PathBasedError();
          pathBased.setPath(err.path.join('.'));
          pathBased.setDetailsList(err.details);
          validationErrors.push(pathBased);
          break;
        }
        case MachineError.ENTITY_ALREADY_EXISTS: {
          const error = new EntityAlreadyExistsError();
          error.setDetailsList(err.details);
          entityAlreadyExists = error;
          break;
        }
        case MachineError.ENTITY_DOES_NOT_EXIST: {
          const error = new EntityDoesNotExistError();
          error.setDetailsList(err.details);
          entityDoesntExists = error;
          break;
        }
        default: {
          const error = new InternalServerError();
          error.setDetailsList(
            err.details ?? [
              'Unexpected error occurred when attempting to process request',
            ]
          );
          other = error;
          break;
        }
      }
    }
    if (validationErrors.length > 0) {
      const err = new ValidationError();
      err.setErrorsList(validationErrors);
      e.setValidation(err);
    } else if (entityAlreadyExists) {
      e.setEntityAlreadyExists(entityAlreadyExists);
    } else if (entityDoesntExists) {
      e.setEntityDoesNotExist(entityDoesntExists);
    } else if (other) {
      e.setInternalServer(other);
    }
    return e;
  }
}

export class OnboardingError {
  private hasBeenLogged = false;
  constructor(
    public readonly error: MachineError,
    public readonly msg: string,
    public readonly category: Category,
    public logger: Logger = log,
    public readonly path: string[] = [],
    public readonly properties = {},
    public details: string[] = [],
    public readonly logLevel: LogLevel = 'error',
    public readonly logOnCreation = true
  ) {
    if (logOnCreation) this.log();
  }

  public log(): void {
    if (this.hasBeenLogged) return;
    const props: Props = {
      ...this.properties,
      category: this.category,
      error: this.error,
      path: this.path.join('.'),
    };
    if (this.details.length > 0) props['details'] = this.details;
    switch (this.logLevel) {
      case 'warn':
        this.logger.warn(props, this.msg);
        break;
      case 'info':
        this.logger.info(props, this.msg);
        break;
      case 'trace':
        this.logger.trace(props, this.msg);
        break;
      case 'debug':
        this.logger.debug(props, this.msg);
        break;
      case 'error':
      default:
        this.logger.error(props, this.msg);
        break;
    }
    this.hasBeenLogged = true;
  }

  public toProtobufError(): PbError {
    const errorMessages = [this.msg, ...this.details];
    const e = new PbError();
    switch (this.error) {
      case MachineError.REQUEST: {
        const error = new InvalidRequestError();
        const pathBased = new PathBasedError();
        pathBased.setPath(this.path.join('.'));
        pathBased.setDetailsList(errorMessages);
        error.setErrorsList([pathBased]);
        e.setValidation(error);
        break;
      }
      case MachineError.VALIDATION: {
        const error = new ValidationError();
        const pathBased = new PathBasedError();
        pathBased.setPath(this.path.join('.'));
        pathBased.setDetailsList(errorMessages);
        error.setErrorsList([pathBased]);
        e.setValidation(error);
        break;
      }
      case MachineError.ENTITY_ALREADY_EXISTS: {
        const error = new EntityAlreadyExistsError();
        error.setDetailsList(errorMessages);
        e.setEntityAlreadyExists(error);
        break;
      }
      case MachineError.ENTITY_DOES_NOT_EXIST: {
        const error = new EntityDoesNotExistError();
        error.setDetailsList(errorMessages);
        e.setEntityDoesNotExist(error);
        break;
      }
      default: {
        const error = new InternalServerError();
        error.setDetailsList(
          errorMessages ?? [
            'Unexpected error occurred when attempting to process request',
          ]
        );
        e.setInternalServer(error);
        break;
      }
    }
    return e;
  }
}

export const UNREACHABLE = () =>
  new OnboardingError(
    MachineError.UNREACHABLE_CODE,
    'This error should not be reachable',
    Category.APP
  );

export const ENVIRONMENT_VARIABLE_ERROR = (envVar: string) =>
  new OnboardingError(
    MachineError.APP_CONFIG,
    `Environment Variable ${envVar} set incorrectly`,
    Category.APP
  );

export const BAD_REQUEST = (
  msg: string,
  path: string[],
  log: Logger,
  props: Props = {}
) =>
  new OnboardingError(
    MachineError.REQUEST,
    msg,
    Category.REQUEST,
    log,
    path,
    props
  );

export const ENTITY_NOT_FOUND = (
  id: ExternalUuid,
  entity: Entity,
  log: Logger,
  props: Props = {},
  shouldLogError = true
) =>
  new OnboardingError(
    MachineError.ENTITY_DOES_NOT_EXIST,
    `${entity} with id ${id} does not exist`,
    Category.POSTGRES,
    log,
    [],
    props,
    [],
    'error',
    shouldLogError
  );

export const ENTITY_NOT_FOUND_FOR = (
  id: ExternalUuid,
  entity: Entity,
  targetId: ExternalUuid,
  targetEntity: Entity,
  log: Logger,
  props: Props = {}
) =>
  new OnboardingError(
    MachineError.ENTITY_DOES_NOT_EXIST,
    `${entity} with id ${id} does not exist for ${targetEntity} with id
    ${targetId}`,
    Category.POSTGRES,
    log,
    [],
    props
  );

export const ENTITY_ALREADY_EXISTS = (
  id: ExternalUuid,
  entity: Entity,
  log: Logger
) =>
  new OnboardingError(
    MachineError.ENTITY_ALREADY_EXISTS,
    `${entity} with id ${id} already exists`,
    Category.REQUEST,
    log
  );

export const POSTGRES_IS_VALID_QUERY = (
  id: ExternalUuid | ExternalUuid[],
  targetEntity: Entity,
  msg: string,
  log: Logger
) => {
  if (Array.isArray(id)) {
    return new OnboardingError(
      MachineError.VALIDATION,
      msg,
      Category.POSTGRES,
      log,
      [],
      { operation: 'IS VALID', targetEntity, targetEntityIds: id.join(', ') }
    );
  }

  return new OnboardingError(
    MachineError.VALIDATION,
    msg,
    Category.POSTGRES,
    log,
    [],
    { operation: 'IS VALID', targetEntity, targetEntityId: id }
  );
};

export const POSTGRES_GET_KIDSLOOP_ID_QUERY = (
  id: ExternalUuid | ExternalUuid[],
  targetEntity: Entity,
  msg: string,
  log: Logger
) => {
  if (Array.isArray(id)) {
    return new OnboardingError(
      MachineError.READ,
      msg,
      Category.POSTGRES,
      log,
      [],
      {
        operation: 'GET KIDSLOOP IDS',
        targetEntity,
        targetEntityIds: id.join(', '),
      }
    );
  }
  return new OnboardingError(
    MachineError.READ,
    msg,
    Category.POSTGRES,
    log,
    [],
    {
      operation: 'GET KIDSLOOP ID',
      targetEntity,
      targetEntityId: id,
    }
  );
};

export function tryGetMember<T>(
  e: T | undefined,
  log: Logger,
  path: string[] = []
): T {
  if (e === undefined)
    throw new OnboardingError(
      MachineError.VALIDATION,
      `Expected to find a valid instance of the provided data however it was undefined`,
      Category.REQUEST,
      log,
      path
    );
  return e;
}

export const returnMessageOrThrowOnboardingError = (e: unknown): string => {
  if (e instanceof OnboardingError || e instanceof Errors) throw e;
  return e instanceof Error ? e.message : `${e}`;
};

export function convertErrorToProtobuf(error: unknown, log: Logger): PbError {
  if (error instanceof Errors || error instanceof OnboardingError) {
    return error.toProtobufError();
  }
  log.warn(
    { error },
    `Found an error that wasn't correctly converted to a response - if you're seeing this the code needs an update`
  );
  throw new Error('Broken Application Error');
}

export const INTERNAL_SERVER_ERROR_PROTOBUF = new PbError().setInternalServer(
  new InternalServerError().setDetailsList(['Unexpected error occurred'])
);
