import { Logger } from 'pino';

import { Category, MachineError, OnboardingError } from '../errors';
import { Gender as PbGender } from '../protos';

export type Gender = 'Male' | 'Female' | 'NOT-SET';

export function protoGenderToString(g: PbGender, log: Logger): Gender {
  switch (g) {
    case PbGender.MALE:
      return 'Male';
    case PbGender.FEMALE:
      return 'Female';
    case PbGender.NULL:
      return 'NOT-SET';
    default:
      throw new OnboardingError(
        MachineError.APP_CONFIG,
        `Have not caught all valid variants of the Gender protobuf Enum`,
        Category.APP,
        log
      );
  }
}
