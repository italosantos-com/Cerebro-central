import { z } from 'zod';

const envSchema = z.object({
    PORT: z.string().optional().default('8080'),
    NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('production'),
    SMS_API_KEY: z.string().min(10, 'SMS_API_KEY is required for auth'),
    ALLOWED_ORIGINS: z.string().optional(),
    USE_FIREBASE_PHONE: z.string().optional().default('false'),
    FIREBASE_WEB_API_KEY: z.string().optional(),
    // Twilio
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM: z.string().optional(),
    // OTP settings
    OTP_TTL_SECONDS: z
        .string()
        .optional()
        .default('300'), // 5 minutes
    OTP_DIGITS: z.string().optional().default('6'),
    OTP_RESEND_WINDOW_SECONDS: z.string().optional().default('60'),
    MAX_SENDS_PER_HOUR: z.string().optional().default('5'),
    MAX_VERIFY_ATTEMPTS: z.string().optional().default('5'),
});

export type AppConfig = z.infer<typeof envSchema> & {
    otpTtlMs: number;
    otpDigits: number;
    resendWindowMs: number;
    maxSendsPerHour: number;
    maxVerifyAttempts: number;
    allowedOrigins: string[] | '*';
    useFirebasePhone: boolean;
};

export const loadConfig = (): AppConfig => {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new Error(`Invalid environment: ${issues}`);
    }
    const env = parsed.data;
    return {
        ...env,
        otpTtlMs: parseInt(env.OTP_TTL_SECONDS, 10) * 1000,
        otpDigits: parseInt(env.OTP_DIGITS, 10),
        resendWindowMs: parseInt(env.OTP_RESEND_WINDOW_SECONDS, 10) * 1000,
        maxSendsPerHour: parseInt(env.MAX_SENDS_PER_HOUR, 10),
        maxVerifyAttempts: parseInt(env.MAX_VERIFY_ATTEMPTS, 10),
        allowedOrigins: env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : '*',
        useFirebasePhone: env.USE_FIREBASE_PHONE === 'true',
    } as AppConfig;
};
