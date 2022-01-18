import R from 'ioredis';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';

import {
  Category,
  MachineError,
  OnboardingError,
  returnMessageOrThrowOnboardingError,
} from '../errors';
import { Message } from '../types';
import { Uuid } from '../utils';

import { RedisKeys } from './keys';

import { RedisClient } from '.';

export class Consumer {
  private static _instance: Consumer;
  private consumerId: Uuid;
  private counter = 0;
  private props = {};

  private static streams = [
    RedisKeys.createOrganization(),
    RedisKeys.createSchool(),
    RedisKeys.createClass(),
    RedisKeys.createUser(),
    RedisKeys.linkEntities(),
  ];

  private streamPointer = 0;

  private constructor(
    private redis: R.Redis | R.Cluster,
    private consumerGroup: string,
    public readonly staleMessageTime: number
  ) {
    this.consumerId = uuidv4();
    this.props = {
      consumerGroup: this.consumerGroup,
      consumerId: this.consumerId,
    };
  }

  public static async getInstance(log: Logger): Promise<Consumer> {
    if (this._instance) return this._instance;
    log.info('Attempting to initialize Redis consumer');
    const client = (await RedisClient.getInstance(log)).client;
    const streamPrefix = process.env.REDIS_STREAM_NAME || '';
    const consumerGroup = process.env.REDIS_CONSUMER_GROUP_NAME || '';
    const staleMessageTime = Number(process.env.REDIS_STALE_MESSAGE_TIMEOUT);
    if (!staleMessageTime)
      throw new OnboardingError(
        MachineError.APP_CONFIG,
        `Environment variable 'REDIS_CONSUMER_STALE_MESSAGE_TIMEOUT' must be set and be a valid number for a consumer`,
        Category.APP
      );
    const props = {
      streamPrefix,
      consumerGroup,
    };
    for (const stream of this.streams) {
      try {
        const streamInfo = await client.xinfo('GROUPS', stream);
        for (const i of streamInfo) {
          if (!(i as string[]).includes(consumerGroup)) {
            await client.xgroup('CREATE', stream, consumerGroup, 0, 'MKSTREAM');
          }
        }
      } catch (e) {
        if (e instanceof Error && e.message === 'ERR no such key') {
          await client.xgroup('CREATE', stream, consumerGroup, 0, 'MKSTREAM');

          log.info(props, 'Succesfully initialized Redis stream');
          return new Consumer(client, consumerGroup, staleMessageTime);
        }
        const msg = e instanceof Error ? e.message : `${e}`;
        throw new OnboardingError(
          MachineError.STREAM,
          `Failed to initialize consumer: ${stream}. ${msg}`,
          Category.REDIS,
          log,
          [],
          props
        );
      }
    }
    log.info(props, 'Succesfully initialized Redis consumer');
    this._instance = new Consumer(client, consumerGroup, staleMessageTime);
    return this._instance;
  }

  /**
   * Tries to read an unread message from the queue.
   */
  public async readMessage(
    messageCount: number,
    logger: Logger
  ): Promise<Message[]> {
    const stream = Consumer.streams[this.streamPointer];
    const log = logger.child({
      ...this.props,
      stream,
    });
    log.debug('Attempting to read message from stream');
    if (this.incrementCounter() === 0) {
      try {
        const msgs = await this.tryAndClaimStaleMessage(
          stream,
          messageCount,
          log
        );
        return msgs;
      } catch (_) {
        /* Logged in function */
      }
    }
    try {
      const m = await this.redis.xreadgroup(
        'GROUP',
        this.consumerGroup,
        this.consumerId,
        'COUNT',
        messageCount,
        'STREAMS',
        stream,
        '>'
      );
      if (!m || m.length === 0) throw new Error('no messages in stream');
      const parsedMessages = [];
      for (const [_stream, messages] of m) {
        for (const [timestamp, msg] of messages) {
          parsedMessages.push(Message.deserialize(msg[1], log, timestamp));
        }
      }

      return parsedMessages;
    } catch (error) {
      log.warn(error);
      if (error instanceof Error && error.message.startsWith('no messages'))
        throw error;
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.STREAM,
        `Failed to read message from stream. ${msg}`,
        Category.REDIS,
        log
      );
    } finally {
      this.incrementStream();
    }
  }

  public async acknowledgeMessage(msg: Message, log: Logger): Promise<void> {
    try {
      if (msg.redisMessageId === undefined)
        throw new Error(
          `Can't acknowledge a message if we don't have the ID of that message`
        );
      if (msg.redisStream === undefined)
        throw new Error(
          `Can't acknowledge a message if we don't have the stream of that message`
        );
      await this.redis.xack(
        msg.redisStream,
        this.consumerGroup,
        msg.redisMessageId
      );
    } catch (error) {
      const m = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.STREAM,
        `Failed to acknowledge message from stream. ${m}`,
        Category.REDIS,
        log,
        [],
        { ...this.props, stream: msg.redisStream }
      );
    }
  }

  private async tryAndClaimStaleMessage(
    stream: string,
    messageCount: number,
    log: Logger
  ): Promise<Message[]> {
    log.trace({ ...this.props, stream }, 'Trying to claim stale message');
    try {
      const m = await this.redis.xautoclaim(
        stream,
        this.consumerGroup,
        this.consumerId,
        this.staleMessageTime,
        '0-0',
        'COUNT',
        messageCount
      );

      if (!m || m[1].length === 0) throw new Error('no messages in stream');

      const parsedMessages: Message[] = [];
      for (const msgs of m[1]) {
        parsedMessages.push(
          Message.deserialize(msgs[1][1], log, msgs[0] as string)
        );
      }

      return parsedMessages;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('no messages'))
        throw error;
      log.warn(
        {
          error: error instanceof Error ? error.message : `${error}`,
          ...this.props,
          stream,
        },
        'Failed to claim stale message from redis'
      );
      throw error;
    }
  }

  private incrementCounter(): number {
    const countToReturn = this.counter;
    if (this.counter === 10) {
      this.counter = 0;
    }
    this.counter += 1;
    return countToReturn;
  }

  private incrementStream(): void {
    this.streamPointer = (this.streamPointer + 1) % Consumer.streams.length;
  }
}

// async function main() {
//   const producer = await Producer.getInstance(log);
//   const r = new OnboardingRequest();
//   const o = new Organization();
//   o.setExternalUuid('12345');
//   o.setName('Hello');
//   r.setOrganization(o);
//   r.setAction(Action.CREATE);
//   const msg = Message.fromOnboardingRequest(r, log);
//   await producer.publishMessage(msg, log);
//   await producer.publishMessage(msg, log);
//   await sleep(2500);
//   const consumer = await Consumer.getInstance(log);
//   await consumer.readMessage(5, log);
//   // console.log(msgs);
// }
// main();
