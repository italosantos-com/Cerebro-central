/**
 * Seção de Pagamento PIX para Página Inicial
 * Exibe opções de planos e gera QR Code PIX via Mercado Pago
 */

'use client';

import { useState } from 'react';
import { MercadoPagoPixPayment } from '@/components/MercadoPagoPixPayment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: 29.90,
    description: 'Ideal para começar',
    features: [
      'Acesso completo por 30 dias',
      'Galeria de fotos',
      'Suporte por email',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 49.90,
    description: 'Melhor custo-benefício',
    features: [
      'Acesso completo por 60 dias',
      'Galeria de fotos e vídeos',
      'Suporte prioritário',
      'Conteúdo exclusivo',
    ],
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 99.90,
    description: 'Experiência completa',
    features: [
      'Acesso vitalício',
      'Galeria completa',
      'Suporte 24/7',
      'Conteúdo exclusivo',
      'Acesso antecipado',
    ],
  },
];

export function PixPaymentSection() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    console.log('[PIX] Pagamento aprovado:', paymentId);
    // Aqui você pode redirecionar para uma página de sucesso ou atualizar o estado do usuário
  };

  const handleBack = () => {
    setShowPayment(false);
    setSelectedPlan(null);
  };

  if (showPayment && selectedPlan) {
    return (
      <section className="py-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 max-w-2xl">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-6"
          >
            ← Voltar aos planos
          </Button>
          
          <MercadoPagoPixPayment
            amount={selectedPlan.price}
            description={`Assinatura ${selectedPlan.name}`}
            onSuccess={handlePaymentSuccess}
            onError={(error) => console.error('Erro no pagamento:', error)}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Escolha seu Plano
          </h2>
          <p className="text-lg text-muted-foreground">
            Pague com PIX e tenha acesso imediato
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative ${
                plan.id === 'premium' 
                  ? 'border-primary shadow-lg scale-105' 
                  : ''
              }`}
            >
              {plan.id === 'premium' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    MAIS POPULAR
                  </span>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    R$ {plan.price.toFixed(2)}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={() => handleSelectPlan(plan)}
                  className="w-full"
                  variant={plan.id === 'premium' ? 'default' : 'outline'}
                >
                  Assinar com PIX
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            💳 Pagamento 100% seguro via Mercado Pago
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Aprovação instantânea • Cancele quando quiser
          </p>
        </div>
      </div>
    </section>
  );
}
