import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import type { AppConfig } from '../config';
import { logger } from '../logger';

export type OtpRecord = {
    phone: string; // E.164
    codeHash: string;
    salt: string;
    // When read from Firestore, this will be a Timestamp; when writing we may use FieldValue
    expiresAt: any;
    attempts: number;
    sendCountHour: number;
    sendWindowUntil?: any;
    createdAt: any;
    updatedAt: any;
};

export class OtpStore {
    private cfg: AppConfig;
    private col = 'sms_otp';

    constructor(cfg: AppConfig) {
        this.cfg = cfg;
        if (getApps().length === 0) {
            try {
                initializeApp();
            } catch (e) {
                logger.error({ err: e }, 'Failed to init firebase-admin');
                throw e;
            }
        }
    }

    private db() {
        return getFirestore();
    }

    private static hash(code: string, salt: string) {
        return crypto.createHmac('sha256', salt).update(code).digest('hex');
    }

    async canResend(phone: string) {
        const docRef = this.db().collection(this.col).doc(phone);
        const snap = await docRef.get();
        if (!snap.exists) return true;
        const data = snap.data() as any;
        const sendWindowUntil = data.sendWindowUntil?.toDate?.();
        if (sendWindowUntil && sendWindowUntil > new Date()) return false;
        return true;
    }

    async createOrUpdateOtp(phone: string, code: string) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.cfg.otpTtlMs);
        const sendWindowUntil = new Date(now.getTime() + this.cfg.resendWindowMs);
        const hourKey = now.getUTCHours();

        const docRef = this.db().collection(this.col).doc(phone);
        const salt = crypto.randomBytes(16).toString('hex');
        const codeHash = OtpStore.hash(code, salt);

        await this.db().runTransaction(async (tx) => {
            const existing = await tx.get(docRef);
            if (existing.exists) {
                const ex = existing.data() as any;
                const sendCountHour = ex.sendCountHourHourKey === hourKey ? (ex.sendCountHour || 0) + 1 : 1;
                tx.update(docRef, {
                    codeHash,
                    salt,
                    expiresAt: FieldValue.serverTimestamp(),
                    attempts: 0,
                    sendCountHour,
                    sendCountHourHourKey: hourKey,
                    sendWindowUntil: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            } else {
                tx.set(docRef, ({
                    phone,
                    codeHash,
                    salt,
                    expiresAt: FieldValue.serverTimestamp(),
                    attempts: 0,
                    sendCountHour: 1,
                    sendCountHourHourKey: hourKey,
                    sendWindowUntil: FieldValue.serverTimestamp(),
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                } as unknown) as Partial<OtpRecord>);
            }
        });

        // Now fix timestamps properly: we need actual dates for expiresAt and sendWindowUntil
        await docRef.update({
            expiresAt,
            sendWindowUntil,
        });
    }

    async verify(phone: string, code: string): Promise<boolean> {
        const docRef = this.db().collection(this.col).doc(phone);
        const snap = await docRef.get();
        if (!snap.exists) return false;
        const data = snap.data() as any;

        // rate limit attempts
        if ((data.attempts || 0) >= this.cfg.maxVerifyAttempts) {
            return false;
        }

        const salt = data.salt as string;
        const codeHash = OtpStore.hash(code, salt);
        const matches = codeHash === data.codeHash;

        const expired = data.expiresAt?.toDate?.() ? data.expiresAt.toDate() < new Date() : true;

        await docRef.update({
            attempts: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
        });

        if (!matches || expired) return false;

        // Success: delete or mark used
        await docRef.delete();
        return true;
    }

    async incrementSendAndCheckQuota(phone: string): Promise<boolean> {
        const docRef = this.db().collection(this.col).doc(phone);
        const now = new Date();
        const hourKey = now.getUTCHours();
        let allowed = true;

        await this.db().runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (snap.exists) {
                const d = snap.data() as any;
                const count = d.sendCountHourHourKey === hourKey ? d.sendCountHour || 0 : 0;
                const next = count + 1;
                if (next > this.cfg.maxSendsPerHour) {
                    allowed = false;
                    return;
                }
                tx.update(docRef, {
                    sendCountHour: next,
                    sendCountHourHourKey: hourKey,
                    updatedAt: FieldValue.serverTimestamp(),
                });
            } else {
                tx.set(docRef, {
                    phone,
                    sendCountHour: 1,
                    sendCountHourHourKey: hourKey,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                } as Partial<OtpRecord>);
            }
        });

        return allowed;
    }
}
