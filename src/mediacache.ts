import {createClient, RedisClientType} from 'redis';
import {MediaInlineDataType} from './types';

const CACHE_EXPIRATION_SECONDS = 3600; // 1 hour

export class MediaCache {
  private client: RedisClientType;
  private namespace: string;

  constructor(namespace = 'media') {
    const redisUrl = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
    this.client = createClient({
      url: redisUrl,
      //password: process.env.REDIS_PASSWORD,
    });

    this.client.on('error', err => console.error('Redis Client Error', err));

    void this.client.connect();
    this.namespace = `${namespace}:`;
  }

  public async getMediaFromCache(
    key: string,
  ): Promise<MediaInlineDataType['inlineData'] | null> {
    try {
      const redisKey = this.namespace + key;
      const value = await this.client.hGetAll(redisKey);

      if (Object.keys(value).length === 0) {
        return null;
      }
      return value as MediaInlineDataType['inlineData'];
    } catch (error) {
      console.error(`Error getting media from cache for key "${key}":`, error);
      return null;
    }
  }

  public async setMediaToCache(
    key: string,
    value: MediaInlineDataType['inlineData'],
  ): Promise<void> {
    try {
      const redisKey = this.namespace + key;
      await this.client
        .multi()
        .hSet(redisKey, {...value})
        .expire(redisKey, CACHE_EXPIRATION_SECONDS)
        .exec();
    } catch (error) {
      console.error(`Error setting media to cache for key "${key}":`, error);
    }
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
