// Função para verificar assinatura sem "use server"
import { subscriptionManager, SUBSCRIPTION_PLANS } from '@/lib/subscription-manager';

export async function checkUserSubscriptionInternal(userId: string) {
  try {
    const isActive = await subscriptionManager.isSubscriptionActive(userId);
    const subscription = isActive ? await subscriptionManager.getUserActiveSubscription(userId) : null;

    return {
      success: true,
      isActive,
      subscription,
      plan: subscription ? SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId) : null
    };
  } catch (error: unknown) {
    console.error('Erro ao verificar assinatura:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function createSubscriptionInternal(data: {
  userId: string;
  email: string;
  planId: string;
  paymentId: string;
  paymentMethod: 'pix' | 'paypal' | 'mercadopago' | 'google_pay';
  adminUid?: string;
}) {
  try {
    const subscriptionId = await subscriptionManager.createSubscription(data);
    return { success: true, subscriptionId };
  } catch (error: unknown) {
    console.error('Erro ao criar assinatura:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function cleanupExpiredSubscriptionsInternal() {
  try {
    const cleanupCount = await subscriptionManager.cleanupExpiredSubscriptions();
    return { success: true, cleanupCount };
  } catch (error: unknown) {
    console.error('Erro no cleanup:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
