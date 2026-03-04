import type { AppConfig } from '../config';
import { logger } from '../logger';

export interface SmsProvider {
    sendSms: (toE164: string, body: string) => Promise<void>;
}

export class NoopSmsProvider implements SmsProvider {
    async sendSms(toE164: string, body: string) {
        logger.warn({ toE164, bodyLength: body.length }, 'SMS provider not configured; skipping send');
    }
}

export class TwilioSmsProvider implements SmsProvider {
    private client: any;
    private from: string;
    constructor(cfg: AppConfig) {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_FROM;
        if (!sid || !token || !from) {
            throw new Error('Twilio env vars missing');
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Twilio = require('twilio');
        this.client = new Twilio(sid, token);
        this.from = from;
    }
    async sendSms(toE164: string, body: string) {
        await this.client.messages.create({ to: toE164, from: this.from, body });
    }
}

export function resolveSmsProvider(cfg: AppConfig): SmsProvider {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
        return new TwilioSmsProvider(cfg);
    }
    return new NoopSmsProvider();
}

// Firebase Phone Auth REST helper — used when opting into Firebase-only flow in routes.
export class FirebasePhoneAuthClient {
    private apiKey: string;
    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async sendVerificationCode(phoneNumber: string, recaptchaToken?: string): Promise<{ sessionInfo: string }> {
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${this.apiKey}`;
        const payload: any = { phoneNumber };
        if (recaptchaToken) payload.recaptchaToken = recaptchaToken;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
            logger.error({ status: res.status, data }, 'Firebase sendVerificationCode failed');
            throw new Error(data?.error?.message || 'firebase_sendVerificationCode_error');
        }
        return { sessionInfo: data.sessionInfo };
    }

    async signInWithPhoneNumber(sessionInfo: string, code: string): Promise<{ idToken: string }> {
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${this.apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionInfo, code }),
        });
        const data = await res.json();
        if (!res.ok) {
            logger.error({ status: res.status, data }, 'Firebase signInWithPhoneNumber failed');
            throw new Error(data?.error?.message || 'firebase_signInWithPhoneNumber_error');
        }
        return { idToken: data.idToken };
    }
}
