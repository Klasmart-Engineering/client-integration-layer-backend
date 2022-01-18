import { Message } from 'google-protobuf';
import { Logger } from 'pino';

import { Category, MachineError, OnboardingError } from '../..';

export class Serde {
  public static serialize<T extends Message>(data: T, log: Logger): Uint8Array {
    try {
      const bytes = data.serializeBinary();
      return bytes;
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to serialize protobuf message';
      throw new OnboardingError(
        MachineError.SERDE,
        msg,
        Category.PROTOBUF,
        log
      );
    }
  }
}
