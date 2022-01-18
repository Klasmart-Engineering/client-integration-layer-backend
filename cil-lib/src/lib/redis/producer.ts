import R from 'ioredis';
import { Logger } from 'pino';

import {
  Category,
  MachineError,
  OnboardingError,
  returnMessageOrThrowOnboardingError,
} from '../errors';
import { Message } from '../types';

import { RedisKeys } from './keys';

import { RedisClient } from '.';
import { Response } from '../protos';
import { Serde } from '../utils';

export class Producer {
  private static _instance: Producer;

  private constructor(private redis: R.Redis | R.Cluster) {}

  public static async getInstance(log: Logger): Promise<Producer> {
    if (this._instance) return this._instance;
    log.info('Attempting to initialize Redis producer');
    const client = (await RedisClient.getInstance(log)).client;
    log.info('Succesfully initialized Redis producer');
    this._instance = new Producer(client);
    return this._instance;
  }

  public async publishMessage(msg: Message, log: Logger): Promise<void> {
    let stream = '';
    try {
      const payload = msg.serialize(log);
      stream = RedisKeys.getKeyForMessage(msg, log);
      await this.redis.xadd(stream, '*', 'PROTO', payload.join(','));
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.STREAM,
        `Failed to publish message to stream. ${msg}`,
        Category.REDIS,
        log,
        [],
        { stream }
      );
    }
  }

  public async publishSuccess(msg: Response, log: Logger): Promise<void> {
    let stream = '';
    try {
      const payload = Serde.serialize(msg, log);
      stream = RedisKeys.successStream();
      await this.redis.xadd(stream, '*', 'PROTO', payload.join(','));
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.STREAM,
        `Failed to publish message to success stream. ${msg}`,
        Category.REDIS,
        log,
        [],
        { stream }
      );
    }
  }

  public async publishFailure(msg: Response, log: Logger): Promise<void> {
    let stream = '';
    try {
      const payload = Serde.serialize(msg, log);
      stream = RedisKeys.failureStream();
      await this.redis.xadd(stream, '*', 'PROTO', payload.join(','));
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.STREAM,
        `Failed to publish message to failure stream. ${msg}`,
        Category.REDIS,
        log,
        [],
        { stream }
      );
    }
  }
}

// async function main() {
//   const redis = await RedisStream.initialize();
//   const r = new OnboardingRequest();
//   const o = new Organization();
//   o.setClientUuid('12345');
//   o.setName('Hello');
//   r.setOrganization(o);
//   const msg = new Message(r, 0);
//   await redis.publishMessage(msg);
//   await sleep(1000);
//   const m = await redis.readMessage();
//   console.log(m.redisMessageId, m.data.toObject());
// }
// main();
