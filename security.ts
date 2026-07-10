import cors from 'cors';
import helmet from 'helmet';
import { env } from '../config/env';

const ALLOWED_ORIGINS = env.FRONTEND_URL.split(',').map((u: string) => u.trim());

export const securityMiddleware = [
    helmet({
        contentSecurityPolicy: env.NODE_ENV === 'production' ? {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", env.API_URL],
            },
        } : false,
        hsts: env.NODE_ENV === 'production' ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        } : undefined,
    }),
    cors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            if (!origin || (origin && ALLOWED_ORIGINS.includes(origin))) {
                callback(null, true);
            } else {
                callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
];