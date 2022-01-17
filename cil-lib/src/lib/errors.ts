import { Logger } from 'pino';

import { Entity, ExternalUuid, log } from '..';

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
  VALIDATION = 'Validation',
  UNREACHABLE_CODE = 'Unreachable',
  READ = 'Read Operation',
  WRITE = 'Write Operation',
  STREAM = 'Data Stream',
  APP_CONFIG = 'Application Configuration',
  SERDE = 'Serde',
  NETWORK = 'Network',
  NOT_FOUND = 'Not Found',
  REQUEST = 'Bad Request',
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export type Props = Record<string, string | string[] | number | boolean>;

export class Errors {
  constructor(public errors: OnboardingError[]) {}
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

export const INVALID_ENTITY = (id: ExternalUuid, entity: Entity, log: Logger) =>
  new OnboardingError(
    MachineError.VALIDATION,
    `Entity ${entity} has no valid item for id ${id}`,
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
      `Expected to find data however it was undefined`,
      Category.REQUEST,
      log,
      path
    );
  return e;
}
