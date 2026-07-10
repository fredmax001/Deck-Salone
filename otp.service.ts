import { redis } from '../../infrastructure/cache/redis';
import { randomInt } from 'node:crypto';

const OTP_TTL = 600; // 10 minutes
const MAX_ATTEMPTS = 3;

interface OtpRecord {
    code: string;
    attempts: number;
    createdAt: number;
}

export async function generateOtp(phone: string): Promise<string> {
    const code = randomInt(100000, 999999).toString();
    const record: OtpRecord = { code, attempts: 0, createdAt: Date.now() };
    await redis.setex(`otp:${phone}`, OTP_TTL, JSON.stringify(record));
    return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
    const key = `otp:${phone}`;
    const data = await redis.get(key);
    if (!data) return false;

    const record: OtpRecord = JSON.parse(data);

    if (record.attempts >= MAX_ATTEMPTS) {
        await redis.del(key);
        return false;
    }

    if (record.code !== code) {
        record.attempts++;
        await redis.setex(key, OTP_TTL, JSON.stringify(record));
        return false;
    }

    await redis.del(key);
    return true;
}