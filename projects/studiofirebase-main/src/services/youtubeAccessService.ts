import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Timestamp } from 'firebase-admin/firestore';

type DbProvider = () => ReturnType<typeof getAdminDb>;

interface YouTubeAccessRecord {
    email: string;
    userId?: string;
    subscriptionId?: string;
    isActive: boolean;
    accessLevel: string;
    grantedAt: Date | Timestamp | FieldValue;
    revokedAt?: Date | Timestamp | FieldValue | null;
    updatedAt: Date | Timestamp | FieldValue;
}

interface SubscriptionRecord {
    id: string;
    email: string;
    userId: string;
    status: string;
    planName?: string;
    currentPeriodEnd?: Date | Timestamp;
}

interface SubscriptionSummary {
    status: string;
    planName?: string;
    currentPeriodEnd?: Date | Timestamp;
}

export class YouTubeAccessService {
    private static dbProvider: DbProvider = getAdminDb;

    static setDbProvider(provider: DbProvider) {
        this.dbProvider = provider;
    }

    static resetDbProvider() {
        this.dbProvider = getAdminDb;
    }

    private static getDbOrThrow() {
        const db = this.dbProvider();
        if (!db) {
            throw new Error('Firestore admin not initialized');
        }
        return db;
    }

    /**
     * Verifica se um email tem acesso a vídeos privados +18
     */
    static async checkAccess(email: string): Promise<boolean> {
        try {
            const db = this.getDbOrThrow();
            const docId = `${email}_adult18plus`;
            const accessDoc = await db
                .collection('youtubePrivateVideoAccess')
                .doc(docId)
                .get();

            if (!accessDoc.exists) {
                return false;
            }

            const data = accessDoc.data() as YouTubeAccessRecord;
            return data?.isActive ?? false;
        } catch (error) {
            console.error('Erro ao verificar acesso:', error);
            return false;
        }
    }

    /**
     * Retorna lista de todos os emails autorizados
     */
    static async getAuthorizedEmails(): Promise<string[]> {
        try {
            const db = this.getDbOrThrow();
            const snapshot = await db
                .collection('youtubePrivateVideoAccess')
                .where('isActive', '==', true)
                .where('accessLevel', '==', 'adult18plus')
                .get();

            return snapshot.docs.map(doc => (doc.data() as YouTubeAccessRecord).email);
        } catch (error) {
            console.error('Erro ao buscar emails autorizados:', error);
            return [];
        }
    }

    /**
     * Retorna detalhes de acesso de um usuário
     */
    static async getAccessDetails(email: string) {
        try {
            const db = this.getDbOrThrow();
            const docId = `${email}_adult18plus`;
            const accessDoc = await db
                .collection('youtubePrivateVideoAccess')
                .doc(docId)
                .get();

            if (!accessDoc.exists) {
                return null;
            }

            const accessData = accessDoc.data() as YouTubeAccessRecord;

            // Buscar subscription se houver subscriptionId
            let subscriptionData: SubscriptionRecord | null = null;
            if (accessData.subscriptionId) {
                const subDoc = await db
                    .collection('subscriptions')
                    .doc(accessData.subscriptionId)
                    .get();

                if (subDoc.exists) {
                    subscriptionData = subDoc.data() as SubscriptionRecord;
                }
            }

            return {
                ...accessData,
                subscription: subscriptionData,
            };
        } catch (error) {
            console.error('Erro ao buscar detalhes de acesso:', error);
            return null;
        }
    }

    /**
     * Adiciona manualmente um email à lista de autorizados
     */
    static async grantAccess(
        email: string,
        userId?: string,
        subscriptionId?: string
    ): Promise<void> {
        try {
            const db = this.getDbOrThrow();
            const docId = `${email}_adult18plus`;
            const docRef = db.collection('youtubePrivateVideoAccess').doc(docId);

            const existingDoc = await docRef.get();

            if (existingDoc.exists) {
                // Update
                await docRef.update({
                    isActive: true,
                    userId: userId || null,
                    subscriptionId: subscriptionId || null,
                    revokedAt: null,
                    updatedAt: FieldValue.serverTimestamp(),
                });
            } else {
                // Create
                await docRef.set({
                    email,
                    userId: userId || null,
                    subscriptionId: subscriptionId || null,
                    isActive: true,
                    accessLevel: 'adult18plus',
                    grantedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }

            console.log(`✅ Acesso concedido para ${email}`);
        } catch (error) {
            console.error(`❌ Erro ao conceder acesso para ${email}:`, error);
            throw error;
        }
    }

    /**
     * Remove manualmente um email da lista de autorizados
     */
    static async revokeAccess(email: string): Promise<void> {
        try {
            const db = this.getDbOrThrow();
            const snapshot = await db
                .collection('youtubePrivateVideoAccess')
                .where('email', '==', email)
                .where('accessLevel', '==', 'adult18plus')
                .where('isActive', '==', true)
                .get();

            const batch = db.batch();

            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    isActive: false,
                    revokedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            });

            await batch.commit();

            console.log(`✅ Acesso revogado para ${email}`);
        } catch (error) {
            console.error(`❌ Erro ao revogar acesso para ${email}:`, error);
            throw error;
        }
    }

    /**
     * Sincroniza acessos com base nas assinaturas ativas
     */
    static async syncWithActiveSubscriptions(): Promise<{
        granted: number;
        revoked: number;
    }> {
        try {
            const db = this.getDbOrThrow();
            let granted = 0;
            let revoked = 0;

            // Buscar assinaturas ativas
            const activeSnapshot = await db
                .collection('subscriptions')
                .where('status', 'in', ['active', 'trialing'])
                .get();

            // Conceder acesso para ativos
            for (const doc of activeSnapshot.docs) {
                const sub = doc.data() as SubscriptionRecord;
                await this.grantAccess(sub.email, sub.userId, doc.id);
                granted++;
            }

            // Buscar assinaturas inativas
            const inactiveSnapshot = await db
                .collection('subscriptions')
                .where('status', 'not-in', ['active', 'trialing'])
                .get();

            // Revogar acessos de assinaturas inativas
            for (const doc of inactiveSnapshot.docs) {
                const sub = doc.data() as SubscriptionRecord;

                const accessSnapshot = await db
                    .collection('youtubePrivateVideoAccess')
                    .where('email', '==', sub.email)
                    .where('subscriptionId', '==', doc.id)
                    .where('isActive', '==', true)
                    .limit(1)
                    .get();

                if (!accessSnapshot.empty) {
                    await this.revokeAccess(sub.email);
                    revoked++;
                }
            }

            return { granted, revoked };
        } catch (error) {
            console.error('Erro na sincronização:', error);
            throw error;
        }
    }

    /**
     * Exporta lista de emails autorizados em formato de texto
     */
    static async exportAuthorizedEmailsList(): Promise<string> {
        const emails = await this.getAuthorizedEmails();
        return emails.join('\n');
    }

    /**
     * Exporta lista com detalhes completos
     */
    static async exportDetailedList() {
        try {
            const db = this.getDbOrThrow();
            const snapshot = await db
                .collection('youtubePrivateVideoAccess')
                .where('isActive', '==', true)
                .orderBy('grantedAt', 'desc')
                .get();

            const results: Array<YouTubeAccessRecord & { subscription: SubscriptionSummary | null }> = [];

            for (const doc of snapshot.docs) {
                const accessData = doc.data() as YouTubeAccessRecord;

                let subscriptionData: SubscriptionSummary | null = null;
                if (accessData.subscriptionId) {
                    const subDoc = await db
                        .collection('subscriptions')
                        .doc(accessData.subscriptionId)
                        .get();

                    if (subDoc.exists) {
                        const sub = subDoc.data() as SubscriptionRecord;
                        subscriptionData = {
                            status: sub.status,
                            planName: sub.planName,
                            currentPeriodEnd: sub.currentPeriodEnd,
                        };
                    }
                }

                results.push({
                    ...accessData,
                    subscription: subscriptionData,
                });
            }

            return results;
        } catch (error) {
            console.error('Erro ao exportar lista detalhada:', error);
            return [];
        }
    }
}
