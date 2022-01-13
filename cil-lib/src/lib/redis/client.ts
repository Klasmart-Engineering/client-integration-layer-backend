import R from 'ioredis';

import { log } from '../..';
import {
  Category,
  ENVIRONMENT_VARIABLE_ERROR,
  MachineError,
  OnboardingError,
} from '../errors';
import { Entity } from '../types';

export class RedisClient {
  private static _instance: RedisClient;

  private constructor(private redis: R.Redis | R.Cluster) {}

  public static async getInstance(): Promise<RedisClient> {
    if (this._instance) return this._instance;
    log.info('Attempting to initialize Redis stream');
    checkRedisEnvVars(true);

    try {
      const client = await RedisClient.createClient();
      log.info('Succesfully initialized Redis client');
      this._instance = new RedisClient(client);
      return this._instance;
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.NETWORK,
        msg,
        Entity.UNKNOWN,
        Category.REDIS
      );
    }
  }

  public static async createClient(): Promise<R.Redis | R.Cluster> {
    const redisMode = process.env.REDIS_MODE ?? `NODE`;
    const port = Number(process.env.REDIS_PORT) || undefined;
    const host = process.env.REDIS_HOST;
    const password = process.env.REDIS_PASSWORD;
    const lazyConnect = true;

    let redis: R.Redis | R.Cluster;
    if (redisMode === `CLUSTER`) {
      redis = new R.Cluster(
        [
          {
            port,
            host,
          },
        ],
        {
          lazyConnect,
          redisOptions: {
            password,
          },
        }
      );
    } else {
      redis = new R(port, host, {
        lazyConnect: true,
        password,
      });
    }
    await redis.connect();
    return redis;
  }

  get client(): R.Redis | R.Cluster {
    return this.redis;
  }
}

function checkRedisEnvVars(checkStream = true): void {
  let vars = ['REDIS_HOST', 'REDIS_PORT'];
  if (checkStream) {
    vars = vars.concat(['REDIS_CONSUMER_GROUP_NAME', 'REDIS_STREAM_NAME']);
  }
  for (const envVar of vars) {
    const env = process.env[envVar];
    if (!env || env.length === 0) {
      throw ENVIRONMENT_VARIABLE_ERROR(envVar);
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
