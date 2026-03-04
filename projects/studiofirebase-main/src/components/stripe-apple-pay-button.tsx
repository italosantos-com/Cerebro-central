// TypeScript: declare ApplePaySession for browser
declare global {
  interface Window {
    ApplePaySession?: any;
  }
}
import React from 'react';
import { STRIPE_CONFIG } from '@/lib/stripe-config';
import { ApplePayButtonCSS } from './ui/ApplePayButtonCSS';

interface StripeApplePayButtonProps {
  amount: number;
  currency: string;
  onSuccess: () => void;
  className?: string;
}

const StripeApplePayButton: React.FC<StripeApplePayButtonProps> = ({ amount, currency, onSuccess, className }) => {
  // Apple Pay nativo só funciona em dispositivos Apple e browsers compatíveis
  const isApplePayAvailable = typeof window !== 'undefined' && window.ApplePaySession && window.ApplePaySession.canMakePayments();

  const handleApplePay = async () => {
    if (!isApplePayAvailable) {
      alert('Apple Pay não está disponível neste dispositivo.');
      return;
    }
    try {
      const session = new window.ApplePaySession(3, {
        countryCode: STRIPE_CONFIG.applePay.countryCode,
        currencyCode: currency,
        supportedNetworks: STRIPE_CONFIG.applePay.supportedNetworks,
        merchantCapabilities: ['supports3DS'],
        total: {
          label: STRIPE_CONFIG.applePay.merchantName,
          amount: amount.toFixed(2),
        },
      });
      session.onpaymentauthorized = async (event: any) => {
        // Envie o token para o backend Stripe
        const token = event.payment.token;
        await fetch('/api/stripe-applepay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, amount, currency })
        });
        onSuccess();
        session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
      };
      session.begin();
    } catch (err) {
      console.error('Erro no Apple Pay:', err);
    }
  };

  return (
    <ApplePayButtonCSS
      onClick={handleApplePay}
      disabled={!isApplePayAvailable}
      className={className}
      width="100%"
      height={48}
      ariaLabel="Pagar com Apple Pay"
      buttonType="plain"
      buttonStyle="black"
    />
  );
};

export default StripeApplePayButton;
