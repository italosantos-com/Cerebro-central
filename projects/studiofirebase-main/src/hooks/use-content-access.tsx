import { useSubscription } from './use-subscription';

export interface ContentAccess {
  canAccessSubscriberContent: boolean;
  isSubscriptionActive: boolean;
  subscriptionPlan: string | null;
  subscriptionExpiry: Date | null;
}

export const useContentAccess = (): ContentAccess => {
  const { hasActiveSubscription, subscription, plan, isLoading } = useSubscription();

  const canAccessSubscriberContent = !isLoading && hasActiveSubscription;
  const isSubscriptionActive = hasActiveSubscription;
  const subscriptionPlan = plan?.name || null;
  const subscriptionExpiry = subscription?.expirationDate ? new Date(subscription.expirationDate) : null;

  return {
    canAccessSubscriberContent,
    isSubscriptionActive,
    subscriptionPlan,
    subscriptionExpiry
  };
};

export default useContentAccess;
