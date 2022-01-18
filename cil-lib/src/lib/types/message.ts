import { Logger } from 'pino';

import { Category, MachineError, OnboardingError } from '../errors';
import { Action, Job, OnboardingRequest } from '../protos';
import { Serde } from '../utils';
import { parseOnboardingRequestForMetadata } from '../utils/parseRequestForMetadata';

import { Entity } from '.';

export class Message {
  public readonly action: Action;
  public readonly entity: Entity;
  public readonly identifier: string;

  private constructor(
    public readonly job: Job,
    log: Logger,
    public readonly redisMessageId?: string,
    public readonly redisStream?: string
  ) {
    const r = job.getRequest();
    if (!r)
      throw new OnboardingError(
        MachineError.APP_CONFIG,
        'Expected to find a request embedded in the job, but none was found',
        Category.PROTOBUF,
        log
      );
    const { entity, identifier, action } = parseOnboardingRequestForMetadata(r);
    this.action = action;
    this.entity = entity;
    this.identifier = identifier;
  }

  get request(): OnboardingRequest | undefined {
    return this.job.getRequest();
  }

  public static deserialize(
    data: string,
    log: Logger,
    redisMessageId?: string,
    stream?: string
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
    return new Message(msg, log, redisMessageId, stream);
  }

  public static fromOnboardingRequest(
    r: OnboardingRequest,
    log: Logger
  ): Message {
    const j = new Job();
    j.setRequest(r);
    return new Message(j, log);
  }

  public serialize(log: Logger): Uint8Array {
    return Serde.serialize(this.job, log);
  }
}
