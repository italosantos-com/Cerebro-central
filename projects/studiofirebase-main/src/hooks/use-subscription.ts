'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';

interface Subscription {
  id: string;
  email: string;
  paymentMethod: string;
  paymentDate: string;
  expirationDate: string;
  amount: number;
  planDuration: number;
  daysRemaining: number;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
  features: string[];
}

export function useSubscription() {
  const { user } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }

      try {
    
        
        const response = await fetch('/api/subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'checkSubscription',
            customerEmail: user.email,
          }),
        });

        const data = await response.json();


        if (data.success && data.isSubscriber) {
          setHasActiveSubscription(true);
          setSubscription(data.subscription);
          
          // Mapear dados da assinatura para o plano
          setPlan({
            id: 'monthly',
            name: 'Assinatura Mensal',
            price: data.subscription.amount || 99.00,
            duration: data.subscription.planDuration || 30,
            features: [
              'Acesso à galeria VIP',
              'Downloads ilimitados',
              'Conteúdo exclusivo',
              'Suporte prioritário'
            ]
          });
        } else {
          setHasActiveSubscription(false);
          setSubscription(null);
          setPlan(null);
        }
      } catch (error) {
  
        setHasActiveSubscription(false);
        setSubscription(null);
        setPlan(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [user?.email]);

  return {
    hasActiveSubscription,
    subscription,
    plan,
    isLoading,
  };
}

// Hook simplificado para verificar apenas se tem acesso
export function useAccess() {
  const { user } = useAuth();
  const { hasActiveSubscription, isLoading } = useSubscription();
  
  return {
    hasAccess: !!user || hasActiveSubscription,
    isLoading
  };
}
