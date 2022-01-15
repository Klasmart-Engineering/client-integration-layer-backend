import {
  Category,
  MachineError,
  OnboardingError,
  tryGetMember,
  UNREACHABLE,
} from '../errors';
import { Job, OnboardingRequest } from '../protos';
import { Uuid } from '../utils';

import { Entity } from '.';

export class Message {
  private constructor(
    public readonly job: Job,
    public readonly redisMessageId?: string
  ) {}

  get data(): OnboardingRequest {
    return tryGetMember(this.job.getRequest());
  }

  get entity(): Entity {
    switch (this.data.getEntityCase()) {
      case OnboardingRequest.EntityCase.ORGANIZATION:
        return Entity.ORGANIZATION;
      case OnboardingRequest.EntityCase.SCHOOL:
        return Entity.SCHOOL;
      case OnboardingRequest.EntityCase.CLASS:
        return Entity.CLASS;
      case OnboardingRequest.EntityCase.USER:
        return Entity.USER;
      default:
        // Unreachable
        throw UNREACHABLE();
    }
  }

  public static deserialize(data: string, redisMessageId?: string): Message {
    const d = data.split(',').map((n) => Number(n));
    const bytes = new Uint8Array(d);
    const msg = Job.deserializeBinary(bytes);
    if (!msg)
      throw new OnboardingError(
        MachineError.SERDE,
        'Failed to deserialize binary message from stream',
        Entity.UNKNOWN,
        Category.PROTOBUF
      );
    return new Message(msg, redisMessageId);
  }

  public static fromOnboardingRequest(
    r: OnboardingRequest,
    requestId: Uuid
  ): Message {
    const j = new Job();
    j.setRequest(r);
    j.setRequestId(requestId);
    return new Message(j);
  }

  public serialize(): Uint8Array {
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
        this.,
        Category.PROTOBUF
      );
    }
  }
}
