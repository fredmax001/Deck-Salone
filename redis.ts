import { Redis } from 'ioredis';
import { env } from '../../shared/config/env';

export const redis = new Redis(env.REDIS_URL, {
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
});

redis.on('error', (err: Error) => {
    console.error('Redis connection error:', err);
});