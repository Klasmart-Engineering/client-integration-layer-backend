import {
  Category,
  MachineError,
  OnboardingError,
  UNREACHABLE,
} from '../errors';
import { OnboardingRequest } from '../protos/api_pb';
import { Event } from '../protos/stream_pb';

import { Entity } from '.';

export class Message {
  private constructor(
    public readonly data: OnboardingRequest,
    private attempts: number = 0,
    public readonly redisMessageId?: string
  ) {}

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
    const msg = Event.deserializeBinary(bytes);
    const message = msg.getData();
    if (!message)
      throw new OnboardingError(
        MachineError.SERDE,
        'Failed to deserialize binary message from stream',
        Entity.UNKNOWN,
        Category.PROTOBUF
      );
    return new Message(message, msg.getRetries(), redisMessageId);
  }

  public static fromOnboardingRequest(r: OnboardingRequest): Message {
    return new Message(r);
  }

  public serialize(): Uint8Array {
    try {
      const event = this.toStreamEvent();
      const bytes = event.serializeBinary();
      return bytes;
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to serialize protobuf message';
      throw new OnboardingError(
        MachineError.SERDE,
        msg,
        Entity.UNKNOWN,
        Category.PROTOBUF
      );
    }
  }

  private toStreamEvent(): Event {
    const event = new Event();
    event.setData(this.data);
    event.setRetries(this.attempts);
    return event;
  }

  get processingAttempts(): number {
    return this.attempts;
  }
}
