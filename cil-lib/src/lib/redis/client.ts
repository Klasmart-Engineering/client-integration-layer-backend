import R from 'ioredis';
import { Logger } from 'pino';

import {
  Category,
  ENVIRONMENT_VARIABLE_ERROR,
  MachineError,
  OnboardingError,
} from '../errors';

export class RedisClient {
  private static _instance: RedisClient;

  private constructor(private redis: R.Redis | R.Cluster) {}

  public static async getInstance(log: Logger): Promise<RedisClient> {
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
      throw new OnboardingError(MachineError.NETWORK, msg, Category.REDIS, log);
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
