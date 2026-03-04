import * as functions from 'firebase-functions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Sincroniza automaticamente o acesso a vídeos privados +18 do YouTube
 * com base no status da assinatura
 */
export const syncYouTubeAccessOnSubscriptionChange = functions.firestore
    .document('subscriptions/{subscriptionId}')
    .onWrite(async (change, context) => {
        const subscriptionId = context.params.subscriptionId;
        const after = change.after.exists ? change.after.data() : null;
        const before = change.before.exists ? change.before.data() : null;

        if (!after) {
            // Assinatura deletada - revogar acesso
            await revokeYouTubeAccess(subscriptionId);
            return;
        }

        const { email, userId, status } = after;

        // Verifica se o status mudou para ativo ou inativo
        const isNowActive = status === 'active' || status === 'trialing';
        const wasActive = before && (before.status === 'active' || before.status === 'trialing');

        if (isNowActive && !wasActive) {
            // Assinatura ativada - conceder acesso
            await grantYouTubeAccess(email, userId, subscriptionId);
        } else if (!isNowActive && wasActive) {
            // Assinatura cancelada/expirada - revogar acesso
            await revokeYouTubeAccess(subscriptionId);
        }
    });

/**
 * Concede acesso a vídeos privados +18
 */
async function grantYouTubeAccess(email: string, userId: string, subscriptionId: string) {
    try {
        await prisma.youTubePrivateVideoAccess.upsert({
            where: {
                email_accessLevel: {
                    email,
                    accessLevel: 'adult18plus',
                },
            },
            update: {
                isActive: true,
                userId,
                subscriptionId,
                revokedAt: null,
                updatedAt: new Date(),
            },
            create: {
                email,
                userId,
                subscriptionId,
                isActive: true,
                accessLevel: 'adult18plus',
            },
        });

        console.log(`✅ Acesso concedido para ${email}`);
    } catch (error) {
        console.error(`❌ Erro ao conceder acesso para ${email}:`, error);
        throw error;
    }
}

/**
 * Revoga acesso a vídeos privados +18
 */
async function revokeYouTubeAccess(subscriptionId: string) {
    try {
        const result = await prisma.youTubePrivateVideoAccess.updateMany({
            where: {
                subscriptionId,
                isActive: true,
            },
            data: {
                isActive: false,
                revokedAt: new Date(),
                updatedAt: new Date(),
            },
        });

        console.log(`✅ Acesso revogado para ${result.count} usuário(s)`);
    } catch (error) {
        console.error(`❌ Erro ao revogar acesso:`, error);
        throw error;
    }
}

/**
 * Cloud Function HTTP para sincronizar todos os usuários manualmente
 */
export const syncAllYouTubeAccess = functions.https.onCall(async (data, context) => {
    // Verificar se o usuário é admin
    if (!context.auth?.token?.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Apenas admins podem executar esta função');
    }

    try {
        // Buscar todas as assinaturas ativas
        const activeSubscriptions = await prisma.subscription.findMany({
            where: {
                status: {
                    in: ['active', 'trialing'],
                },
            },
        });

        // Conceder acesso para todos os ativos
        const grantPromises = activeSubscriptions.map(sub =>
            grantYouTubeAccess(sub.email, sub.userId, sub.id)
        );

        // Revogar acesso para assinaturas inativas
        const inactiveSubscriptions = await prisma.subscription.findMany({
            where: {
                status: {
                    notIn: ['active', 'trialing'],
                },
            },
        });

        const revokePromises = inactiveSubscriptions.map(sub =>
            revokeYouTubeAccess(sub.id)
        );

        await Promise.all([...grantPromises, ...revokePromises]);

        return {
            success: true,
            granted: activeSubscriptions.length,
            revoked: inactiveSubscriptions.length,
        };
    } catch (error) {
        console.error('Erro na sincronização:', error);
        throw new functions.https.HttpsError('internal', 'Erro ao sincronizar acessos');
    }
});

/**
 * Scheduled function para sincronizar diariamente
 */
export const dailyYouTubeAccessSync = functions.pubsub
    .schedule('0 3 * * *') // 3 AM todos os dias
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        console.log('🔄 Iniciando sincronização diária...');

        try {
            // Buscar assinaturas ativas
            const activeSubscriptions = await prisma.subscription.findMany({
                where: {
                    status: {
                        in: ['active', 'trialing'],
                    },
                },
            });

            // Atualizar acessos
            for (const sub of activeSubscriptions) {
                await grantYouTubeAccess(sub.email, sub.userId, sub.id);
            }

            // Revogar acessos expirados
            await prisma.youTubePrivateVideoAccess.updateMany({
                where: {
                    isActive: true,
                    subscription: {
                        status: {
                            notIn: ['active', 'trialing'],
                        },
                    },
                },
                data: {
                    isActive: false,
                    revokedAt: new Date(),
                },
            });

            console.log(`✅ Sincronização concluída: ${activeSubscriptions.length} usuários ativos`);
        } catch (error) {
            console.error('❌ Erro na sincronização diária:', error);
        }
    });
