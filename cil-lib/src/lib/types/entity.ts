import { Logger } from 'pino';

import { proto } from '../..';
import { Category, MachineError, OnboardingError } from '../errors';

export enum Entity {
  ORGANIZATION = 'Organization',
  SCHOOL = 'School',
  CLASS = 'Class',
  USER = 'User',
  ROLE = 'Role',
  PROGRAM = 'Program',
  UNKNOWN = 'Unknown',
}

export function entityToProtobuf(e: Entity, log: Logger): proto.Entity {
  switch (e) {
    case Entity.ORGANIZATION:
      return proto.Entity.ORGANIZATION;
    case Entity.SCHOOL:
      return proto.Entity.SCHOOL;
    case Entity.CLASS:
      return proto.Entity.CLASS;
    case Entity.USER:
      return proto.Entity.USER;
    case Entity.PROGRAM:
      return proto.Entity.PROGRAM;
    case Entity.ROLE:
      return proto.Entity.ROLE;
    default:
      throw new OnboardingError(
        MachineError.APP_CONFIG,
        'Unable to map app Entity to protobuf Entity',
        Category.APP,
        log
      );
  }
}

export function protobufToEntity(e: proto.Entity, log: Logger): Entity {
  switch (e) {
    case proto.Entity.ORGANIZATION:
      return Entity.ORGANIZATION;
    case proto.Entity.SCHOOL:
      return Entity.SCHOOL;
    case proto.Entity.CLASS:
      return Entity.CLASS;
    case proto.Entity.USER:
      return Entity.USER;
    case proto.Entity.PROGRAM:
      return Entity.PROGRAM;
    case proto.Entity.ROLE:
      return Entity.ROLE;
    default:
      throw new OnboardingError(
        MachineError.APP_CONFIG,
        'Unable to map protobuf Entity to app Entity',
        Category.APP,
        log
      );
  }
}
