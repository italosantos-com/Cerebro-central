'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/lib/subscription-manager';
import PayPalButton from '@/components/paypal-buttons-v5';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface SubscriptionPlansProps {
  onPaymentSuccess: (planId: string) => void;
  className?: string;
}

export default function SubscriptionPlans({ onPaymentSuccess, className }: SubscriptionPlansProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const handlePaymentSuccess = (planId: string) => {
    toast({
      title: '🎉 Pagamento Aprovado!',
      description: 'Sua assinatura foi ativada com sucesso!',
      duration: 5000,
    });
    
    // Salvar informações da assinatura no localStorage
    localStorage.setItem('hasPaid', 'true');
    localStorage.setItem('hasSubscription', 'true');
    localStorage.setItem('selectedPlan', planId);
    localStorage.setItem('subscriptionStartDate', new Date().toISOString());
    
    onPaymentSuccess(planId);
    router.push('/assinante');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const calculateDailyPrice = (price: number, duration: number) => {
    const dailyPrice = price / duration;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(dailyPrice);
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {SUBSCRIPTION_PLANS.map((plan) => (
        <Card 
          key={plan.id} 
          className={`relative transition-all duration-300 hover:scale-105 ${
            plan.popular 
              ? 'border-gray-400 shadow-lg ring-2 ring-gray-400/20' 
              : 'border-border hover:border-gray-400/50'
          }`}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-white text-black px-3 py-1">
                <Star className="w-3 h-3 mr-1" />
                Mais Popular
              </Badge>
            </div>
          )}
          
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
            <div className="space-y-0.5">
              <div className="text-3xl font-bold text-white">
                {formatPrice(plan.price)}
              </div>
              <CardDescription className="text-sm">
                {calculateDailyPrice(plan.price, plan.duration)}/dia
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="text-center text-sm text-muted-foreground">
              Acesso por {plan.duration} {plan.duration === 1 ? 'dia' : 'dias'}
            </div>
            
            <ul className="space-y-1.5">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          
          <CardFooter className="pt-2">
            <div className="w-full space-y-2">
              <PayPalButton
                onSuccess={() => handlePaymentSuccess(plan.id)}
                amount={plan.price}
                currency="BRL"
                description={`${plan.name} - ${formatPrice(plan.price)}`}
              />
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedPlan(plan);
                  toast({
                    title: 'PIX em breve',
                    description: 'O pagamento via PIX será implementado em breve.',
                  });
                }}
              >
                Pagar com PIX
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
