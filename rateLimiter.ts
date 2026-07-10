import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { Request, Response } from 'express';

const isDev = env.NODE_ENV === 'development';

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 1000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.ip || 'unknown',
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            error: 'Too many requests. Please try again later.',
            retryAfter: req.rateLimit ? Math.ceil(req.rateLimit.resetTime / 1000) : 60,
        });
    },
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 100 : 5,
    skipSuccessfulRequests: true,
});

export const playLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req: Request) => `${req.ip}:${req.params.id}`,
});