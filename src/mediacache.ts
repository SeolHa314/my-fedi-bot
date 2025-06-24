import {createClient} from 'redis';
import {MediaInlineDataType} from './types';

export class MediaCache {
  private client;
  private namespace: string;

  constructor(namespace?: string) {
    this.client = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      //password: process.env.REDIS_PASSWORD,
    });
    this.client.connect();
    this.namespace = (namespace || 'media') + ':';
  }

  public async getMediaFromCache(
    key: string
  ): Promise<MediaInlineDataType['inlineData'] | null> {
    return this.client.hGetAll(this.namespace + key).then(value => {
      if (Object.keys(value).length === 0) return null;
      else return value as MediaInlineDataType['inlineData'];
    });
  }

  public async setMediaToCache(
    key: string,
    value: MediaInlineDataType['inlineData']
  ) {
    return this.client
      .multi()
      .hSet(this.namespace + key, value)
      .expire(this.namespace + key, 60 * 60)
      .exec();
  }
}
