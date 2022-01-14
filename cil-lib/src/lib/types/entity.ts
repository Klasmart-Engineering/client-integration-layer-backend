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

export function entityToProtobuf(e: Entity): proto.Entity {
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
        Entity.UNKNOWN,
        Category.APP
      );
  }
}
