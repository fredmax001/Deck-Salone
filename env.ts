import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    FRONTEND_URL: z.string().url(),
    API_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    // Google OAuth Credentials
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_AUTH_URI: z.string().url(),
    GOOGLE_TOKEN_URI: z.string().url(),
    GOOGLE_AUTH_PROVIDER_X509_CERT_URL: z.string().url(),
    GOOGLE_REDIRECT_URI: z.string().url(),
    GOOGLE_JAVASCRIPT_ORIGINS: z.string().url(), // Assuming a single origin for now

    // Add other environment variables as needed
});

export const env = envSchema.parse(process.env);

declare global {
    namespace NodeJS {
        interface ProcessEnv extends z.infer<typeof envSchema> { }
    }
}