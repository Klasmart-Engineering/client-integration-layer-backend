import R from 'ioredis';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';

import { Category, MachineError, OnboardingError } from '../errors';
import { Message } from '../types';
import { Uuid } from '../utils';

import { RedisClient } from '.';

// 3 minutes
const STALE_MESSAGE = 60 * 1000 * 3;

export class RedisStream {
  private static _instance: RedisStream;
  private consumerId: Uuid;
  private counter = 0;
  private props = {};

  private constructor(
    private redis: R.Redis | R.Cluster,
    private stream: string,
    private consumerGroup: string
  ) {
    this.consumerId = uuidv4();
    this.props = {
      stream: this.stream,
      consumerGroup: this.consumerGroup,
      consumerId: this.consumerId,
    };
  }

  public static async getInstance(log: Logger): Promise<RedisStream> {
    if (this._instance) return this._instance;
    log.info('Attempting to initialize Redis stream');
    const client = (await RedisClient.getInstance(log)).client;
    const stream = process.env.REDIS_STREAM_NAME || '';
    const consumerGroup = process.env.REDIS_CONSUMER_GROUP_NAME || '';
    const props = {
      stream,
      consumerGroup,
    };
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
        return new RedisStream(client, stream, consumerGroup);
      }
      const msg = e instanceof Error ? e.message : `${e}`;
      throw new OnboardingError(
        MachineError.STREAM,
        `Failed to initialize stream. ${msg}`,
        Category.REDIS,
        log,
        [],
        props
      );
    }
    log.info(props, 'Succesfully initialized Redis stream');
    this._instance = new RedisStream(client, stream, consumerGroup);
    return this._instance;
  }

  public async publishMessage(msg: Message, log: Logger): Promise<void> {
    try {
      const payload = msg.serialize(log);
      await this.redis.xadd(this.stream, '*', 'PROTO', payload.join(','));
    } catch (error) {
      const m = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.STREAM,
        `Failed to publish message to stream. ${m}`,
        Category.REDIS,
        log,
        [],
        this.props
      );
    }
  }

  /**
   * Tries to read an unread message from the queue.
   */
  public async readMessage(log: Logger): Promise<Message> {
    log.trace(this.props, 'Attempting to read message from stream');
    if (this.incrementCounter() === 0) {
      try {
        const msg = await this.tryAndClaimStaleMessage(log);
        return msg;
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
        1,
        'STREAMS',
        this.stream,
        '>'
      );
      if (!m || m.length === 0) throw new Error('No messages in stream');
      if (m.length > 1) throw new Error('Received more messages than expected');
      // Yeah I know... Redis likes nesting arrays
      // This indexing gets the ID for the message, used for the ACK
      const msgId = m[0][1][0][0];

      // This indexing gets the `Value` for the K-V pair of the message
      const msg = m[0][1][0][1][1];
      const message = Message.deserialize(msg, log, msgId);

      return message;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('No messages'))
        throw error;
      const m = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.STREAM,
        `Failed to read message from stream. ${m}`,
        Category.REDIS,
        log,
        [],
        this.props
      );
    }
  }

  public async acknowledgeMessage(msg: Message, log: Logger): Promise<void> {
    try {
      if (msg.redisMessageId === undefined)
        throw new Error(
          `Can't acknowledge a message if we don't have the ID of that message`
        );
      await this.redis.xack(
        this.stream,
        this.consumerGroup,
        msg.redisMessageId
      );
    } catch (error) {
      const m = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.STREAM,
        `Failed to acknowledge message from stream. ${m}`,
        Category.REDIS,
        log,
        [],
        this.props
      );
    }
  }

  private async tryAndClaimStaleMessage(log: Logger): Promise<Message> {
    log.trace(this.props, 'Trying to claim stale message');
    try {
      const m = await this.redis.xautoclaim(
        this.stream,
        this.consumerGroup,
        this.consumerId,
        STALE_MESSAGE,
        '0-0',
        'COUNT',
        1
      );

      if (!m || m[1].length === 0) throw new Error('No messages in stream');
      if (m[1].length > 1)
        throw new Error('Received more messages than expected');

      const msgId = m[1][0][0];
      const msg = m[1][0][1][1];
      const message = Message.deserialize(msg, log, msgId);

      return message;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('No messages'))
        throw error;
      log.warn(
        {
          error: error instanceof Error ? error.message : `${error}`,
          ...this.props,
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
