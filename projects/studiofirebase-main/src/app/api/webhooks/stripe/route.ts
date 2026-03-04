import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Webhook do Stripe para sincronizar automaticamente
 * o acesso a vídeos privados +18 quando assinaturas mudam
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const signature = req.headers.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err: any) {
            console.error(`⚠️ Webhook signature verification failed:`, err.message);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        console.log(`📨 Evento recebido: ${event.type}`);

        // Processar eventos relevantes
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            default:
                console.log(`ℹ️ Evento não tratado: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}

/**
 * Atualiza ou cria assinatura no banco de dados
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    try {
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const email = (customer as Stripe.Customer).email;

        if (!email) {
            console.error('❌ Cliente sem email');
            return;
        }

        // Determina o userId (você pode ajustar essa lógica)
        const userId = (customer as Stripe.Customer).metadata?.userId || subscription.metadata?.userId;

        const subscriptionData = {
            email,
            userId: userId || email,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            planId: subscription.items.data[0]?.price.id,
            planName: subscription.items.data[0]?.price.nickname || 'Premium',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: new Date(),
        };

        // Criar ou atualizar assinatura no Firestore
        const subscriptionRef = adminDb.collection('subscriptions').doc(subscription.id);
        await subscriptionRef.set(subscriptionData, { merge: true });

        // Conceder ou revogar acesso baseado no status
        const isActive = subscription.status === 'active' || subscription.status === 'trialing';

        const accessRef = adminDb.collection('youtubePrivateVideoAccess').doc(`${email}_adult18plus`);

        if (isActive) {
            await accessRef.set({
                email,
                userId: userId || email,
                subscriptionId: subscription.id,
                isActive: true,
                accessLevel: 'adult18plus',
                revokedAt: null,
                updatedAt: new Date(),
            }, { merge: true });

            console.log(`✅ Acesso concedido para ${email} (${subscription.status})`);
        } else {
            await accessRef.set({
                isActive: false,
                revokedAt: new Date(),
                updatedAt: new Date(),
            }, { merge: true });

            console.log(`🚫 Acesso revogado para ${email} (${subscription.status})`);
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar assinatura:', error);
        throw error;
    }
}

/**
 * Remove assinatura e revoga acesso
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
        const subscriptionRef = adminDb.collection('subscriptions').doc(subscription.id);
        const subscriptionDoc = await subscriptionRef.get();

        if (!subscriptionDoc.exists) {
            console.warn('⚠️ Assinatura não encontrada no banco');
            return;
        }

        const dbSubscription = subscriptionDoc.data();

        // Atualizar status da assinatura
        await subscriptionRef.update({
            status: 'canceled',
            updatedAt: new Date(),
        });

        // Revogar acesso
        const accessRef = adminDb.collection('youtubePrivateVideoAccess').doc(`${dbSubscription?.email}_adult18plus`);
        await accessRef.update({
            isActive: false,
            revokedAt: new Date(),
            updatedAt: new Date(),
        });

        console.log(`✅ Assinatura cancelada e acesso revogado para ${dbSubscription?.email}`);
    } catch (error) {
        console.error('❌ Erro ao deletar assinatura:', error);
        throw error;
    }
}

/**
 * Pagamento bem-sucedido - garantir acesso ativo
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;

    try {
        const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
        );
        await handleSubscriptionUpdate(subscription);
        console.log(`✅ Pagamento confirmado e acesso atualizado`);
    } catch (error) {
        console.error('❌ Erro ao processar pagamento:', error);
    }
}

/**
 * Pagamento falhou - revogar acesso se necessário
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;

    try {
        const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
        );

        // Se o status for past_due, pode revogar o acesso
        if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
            const subscriptionRef = adminDb.collection('subscriptions').doc(subscription.id);
            const subscriptionDoc = await subscriptionRef.get();

            if (subscriptionDoc.exists) {
                const dbSubscription = subscriptionDoc.data();

                const accessRef = adminDb.collection('youtubePrivateVideoAccess').doc(`${dbSubscription?.email}_adult18plus`);
                await accessRef.update({
                    isActive: false,
                    revokedAt: new Date(),
                    updatedAt: new Date(),
                });

                console.log(`⚠️ Acesso revogado devido a pagamento falhado: ${dbSubscription?.email}`);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao processar falha de pagamento:', error);
    }
}
