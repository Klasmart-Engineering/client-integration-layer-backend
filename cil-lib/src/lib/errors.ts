import { log } from '..';

import { Entity } from './types';

export enum Category {
  REQUEST = 'REQUEST',
  APP = 'APPLICATION',
  REDIS = 'REDIS',
  POSTGRES = 'POSTGRES',
  ADMIN_SERVICE = 'ADMIN SERVICE',
  C1_API = 'C1 API',
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
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export class Errors {
  constructor(public errors: OnboardingError[]) {}
}

export class OnboardingError {
  private hasBeenLogged = false;
  constructor(
    public readonly error: MachineError,
    public readonly msg: string,
    public readonly entity: Entity,
    public readonly category: Category,
    public readonly properties = {},
    public readonly details: string[] = [],
    public readonly logLevel: LogLevel = 'error',
    public readonly logOnCreation = true
  ) {
    if (logOnCreation) this.log();
  }

  public log(): void {
    if (this.hasBeenLogged) return;
    const props: Record<string, string | string[] | number | boolean> = {
      ...this.properties,
      category: this.category,
      error: this.error,
      entity: this.entity.toString(),
    };
    if (this.details.length > 0) props['details'] = this.details;
    switch (this.logLevel) {
      case 'warn':
        log.warn(props, this.msg);
        break;
      case 'info':
        log.info(props, this.msg);
        break;
      case 'trace':
        log.trace(props, this.msg);
        break;
      case 'debug':
        log.debug(props, this.msg);
        break;
      case 'error':
      default:
        log.error(props, this.msg);
        break;
    }
    this.hasBeenLogged = true;
  }
}

export const UNREACHABLE = () =>
  new OnboardingError(
    MachineError.UNREACHABLE_CODE,
    'This error should not be reachable',
    Entity.UNKNOWN,
    Category.APP
  );

export const ENVIRONMENT_VARIABLE_ERROR = (envVar: string) =>
  new OnboardingError(
    MachineError.APP_CONFIG,
    `Environment Variable ${envVar} set incorrectly`,
    Entity.UNKNOWN,
    Category.APP
  );
