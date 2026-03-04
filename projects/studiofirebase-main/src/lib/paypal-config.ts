// Configuração do PayPal
export const paypalConfig = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox' as 'live' | 'sandbox',
  
  // Configurações de pagamento
  payment: {
    intent: 'CAPTURE' as const,
    application_context: {
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/assinante?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/assinante?canceled=true`,
      brand_name: 'Studio VIP',
      landing_page: 'LOGIN',
      user_action: 'PAY_NOW',
      shipping_preference: 'NO_SHIPPING'
    }
  },

  // Configurações de assinatura
  subscription: {
    plan_id: process.env.PAYPAL_PLAN_ID || '',
    application_context: {
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/assinante?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/assinante?canceled=true`,
      brand_name: 'Studio VIP',
      landing_page: 'LOGIN',
      user_action: 'SUBSCRIBE_NOW',
      shipping_preference: 'NO_SHIPPING'
    }
  },

  // Configurações de produtos
  products: {
    subscription: {
      name: 'Assinatura Mensal Studio VIP',
      description: 'Acesso completo ao conteúdo exclusivo por 30 dias',
      amount: '99.00',
      currency: 'BRL',
      duration: 30, // dias
      features: [
        'Acesso total ao conteúdo exclusivo',
        'Downloads ilimitados',
        'Suporte dedicado',
        'Conteúdo em alta definição'
      ]
    }
  }
};

