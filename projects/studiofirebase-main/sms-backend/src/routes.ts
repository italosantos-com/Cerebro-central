import express from 'express';
import { z } from 'zod';
import { loadConfig } from './config';
import { logger } from './logger';
import { normalizeToE164 } from './utils/phone';
import { OtpStore } from './otp/store';
import { resolveSmsProvider, FirebasePhoneAuthClient } from './sms/provider';

const cfg = loadConfig();
const otpStore = new OtpStore(cfg);
const sms = resolveSmsProvider(cfg);
const firebasePhone = cfg.useFirebasePhone && process.env.FIREBASE_WEB_API_KEY
    ? new FirebasePhoneAuthClient(process.env.FIREBASE_WEB_API_KEY!)
    : null;

const router = express.Router();

const sendSchema = z.object({
    phone: z.string().min(6),
    locale: z.string().optional(),
    // For Firebase mode, if recaptcha is required, client must pass a token (only possible if front integrates).
    recaptchaToken: z.string().optional(),
});

const verifySchema = z.object({
    phone: z.string().min(6),
    code: z.string().regex(/^\d+$/),
    // Firebase mode requires the sessionInfo returned by sendVerificationCode.
    sessionInfo: z.string().optional(),
});

function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
    const apiKey = req.header('x-api-key');
    if (!apiKey || apiKey !== cfg.SMS_API_KEY) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    return next();
}

router.get('/healthz', (_req, res) => res.json({ ok: true }));

router.post('/v1/sms/send-otp', requireApiKey, async (req, res) => {
    try {
        const parsed = sendSchema.parse(req.body);
        const phone = normalizeToE164(parsed.phone);

        if (firebasePhone) {
            // Firebase-native flow: we don't generate the code; Firebase does and returns sessionInfo.
            // Note: In production, Firebase requires reCAPTCHA or equivalent; without front changes this may fail.
            const token = parsed.recaptchaToken;
            try {
                const { sessionInfo } = await firebasePhone.sendVerificationCode(phone, token);
                return res.json({ ok: true, mode: 'firebase', sessionInfo });
            } catch (e: any) {
                const msg = e?.message || '';
                if (msg.includes('MISSING_RECAPTCHA_TOKEN') || msg.includes('INVALID_RECAPTCHA_TOKEN')) {
                    return res.status(400).json({ error: 'recaptcha_required', details: msg });
                }
                return res.status(502).json({ error: 'firebase_send_failed', details: msg });
            }
        }

        // Custom flow (no Firebase phone): maintain legacy behavior.
        const canResend = await otpStore.canResend(phone);
        if (!canResend) {
            return res.status(429).json({ error: 'resend_not_allowed_yet' });
        }

        const withinQuota = await otpStore.incrementSendAndCheckQuota(phone);
        if (!withinQuota) {
            return res.status(429).json({ error: 'rate_limited' });
        }

        const digits = cfg.otpDigits;
        const code = Array.from({ length: digits }, () => Math.floor(Math.random() * 10)).join('');
        await otpStore.createOrUpdateOtp(phone, code);
        const body = `Seu código de verificação é: ${code}. Ele expira em ${Math.round(cfg.otpTtlMs / 60000)} minutos.`;
        await sms.sendSms(phone, body);
        return res.json({ ok: true, mode: 'custom', ttlSeconds: Math.round(cfg.otpTtlMs / 1000) });
    } catch (err: any) {
        logger.error({ err }, 'send-otp failed');
        if (err.name === 'ZodError') {
            return res.status(400).json({ error: 'invalid_request', details: err.errors });
        }
        if (err.message?.includes('Invalid phone')) {
            return res.status(400).json({ error: 'invalid_phone' });
        }
        return res.status(500).json({ error: 'internal_error' });
    }
});

router.post('/v1/sms/verify-otp', requireApiKey, async (req, res) => {
    try {
        const parsed = verifySchema.parse(req.body);
        const phone = normalizeToE164(parsed.phone);
        if (firebasePhone) {
            if (!parsed.sessionInfo) {
                return res.status(400).json({ error: 'sessionInfo_required_for_firebase' });
            }
            try {
                const { idToken } = await firebasePhone.signInWithPhoneNumber(parsed.sessionInfo, parsed.code);
                // We return ok and idToken if caller wants to use it client-side; or ignore it.
                return res.json({ ok: true, mode: 'firebase', idToken });
            } catch (e: any) {
                const msg = e?.message || '';
                return res.status(400).json({ ok: false, error: 'invalid_or_expired', details: msg });
            }
        }

        const ok = await otpStore.verify(phone, parsed.code);
        if (!ok) return res.status(400).json({ ok: false, error: 'invalid_or_expired' });
        return res.json({ ok: true, mode: 'custom' });
    } catch (err: any) {
        logger.error({ err }, 'verify-otp failed');
        if (err.name === 'ZodError') {
            return res.status(400).json({ error: 'invalid_request', details: err.errors });
        }
        if (err.message?.includes('Invalid phone')) {
            return res.status(400).json({ error: 'invalid_phone' });
        }
        return res.status(500).json({ error: 'internal_error' });
    }
});

export default router;
