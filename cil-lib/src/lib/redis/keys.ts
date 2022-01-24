import { Logger } from 'pino';

import { Category, MachineError, OnboardingError } from '../..';
import { Entity, Message } from '../types';

export class RedisKeys {
  private static createPrefix(): string {
    return 'create';
  }

  public static createOrganization(): string {
    return `${
      process.env.REDIS_STREAM_NAME
    }::${this.createPrefix()}::organization`;
  }

  public static createSchool(): string {
    return `${process.env.REDIS_STREAM_NAME}::${this.createPrefix()}::school`;
  }

  public static createClass(): string {
    return `${process.env.REDIS_STREAM_NAME}::${this.createPrefix()}::class`;
  }

  public static createUser(): string {
    return `${process.env.REDIS_STREAM_NAME}::${this.createPrefix()}::user`;
  }

  public static linkEntities(): string {
    return `${process.env.REDIS_STREAM_NAME}::link_entity`;
  }

  public static successStream(): string {
    return `${process.env.REDIS_STREAM_NAME}::success`;
  }

  public static failureStream(): string {
    return `${process.env.REDIS_STREAM_NAME}::failure`;
  }

  public static getKeyForMessage(msg: Message, log: Logger): string {
    let stream: string;
    switch (msg.entity) {
      case Entity.ORGANIZATION: {
        stream = RedisKeys.createOrganization();
        break;
      }
      case Entity.SCHOOL: {
        stream = RedisKeys.createSchool();
        break;
      }
      case Entity.CLASS: {
        stream = RedisKeys.createClass();
        break;
      }
      case Entity.USER: {
        stream = RedisKeys.createUser();
        break;
      }
      default:
        throw new OnboardingError(
          MachineError.REQUEST,
          'Unable to identify which stream should be published to',
          Category.REDIS,
          log
        );
    }
    return stream;
  }
}
