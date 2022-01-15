import { Logger } from 'pino';

import { Category, MachineError, OnboardingError } from '../errors';
import { Job, OnboardingRequest } from '../protos';

export class Message {
  private constructor(
    public readonly job: Job,
    public readonly redisMessageId?: string
  ) {}

  get request(): OnboardingRequest | undefined {
    return this.job.getRequest();
  }

  public static deserialize(
    data: string,
    log: Logger,
    redisMessageId?: string
  ): Message {
    const d = data.split(',').map((n) => Number(n));
    const bytes = new Uint8Array(d);
    const msg = Job.deserializeBinary(bytes);
    if (!msg)
      throw new OnboardingError(
        MachineError.SERDE,
        'Failed to deserialize binary message from stream',
        Category.PROTOBUF,
        log
      );
    return new Message(msg, redisMessageId);
  }

  public static fromOnboardingRequest(r: OnboardingRequest): Message {
    const j = new Job();
    j.setRequest(r);
    return new Message(j);
  }

  public serialize(log: Logger): Uint8Array {
    try {
      const bytes = this.job.serializeBinary();
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
