'use client';

import { useEffect, useState } from 'react';
import { PAYMENT_CONFIG } from '@/config/payment-methods.config';

interface UseApplePayWithPayPalOptions {
  amount: string;
  currency?: string;
  onSuccess?: (payment: any) => void;
  onError?: (error: any) => void;
}

export function useApplePayWithPayPal({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
}: UseApplePayWithPayPalOptions) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  async function checkAvailability() {
    if (typeof window === 'undefined' || !(window as any).ApplePaySession) {
      setIsAvailable(false);
      return;
    }

    try {
      const canMakePayments = await (window as any).ApplePaySession.canMakePayments();
      setIsAvailable(canMakePayments);
    } catch (error) {
      console.error('Erro ao verificar Apple Pay:', error);
      setIsAvailable(false);
    }
  }

  async function initiatePayment() {
    if (!isAvailable || isProcessing) return;

    setIsProcessing(true);

    try {
      // 1. Criar ordem no PayPal
      const orderResponse = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          payment_method: 'apple_pay',
        }),
      });

      if (!orderResponse.ok) throw new Error('Falha ao criar ordem PayPal');
      const { order_id } = await orderResponse.json();

      // 2. Configurar Apple Pay
      const paymentRequest = {
        countryCode: PAYMENT_CONFIG.applePay.countryCode,
        currencyCode: currency,
        supportedNetworks: PAYMENT_CONFIG.applePay.supportedNetworks,
        merchantCapabilities: PAYMENT_CONFIG.applePay.merchantCapabilities,
        total: {
          label: PAYMENT_CONFIG.applePay.merchantName,
          amount: amount,
        },
      };

      // 3. Iniciar sessão Apple Pay
      const session = new (window as any).ApplePaySession(3, paymentRequest);

      session.onvalidatemerchant = async (event: any) => {
        try {
          const response = await fetch('/api/payments/apple-pay/validate-merchant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              validationURL: event.validationURL,
              merchantId: PAYMENT_CONFIG.applePay.merchantId,
              order_id,
            }),
          });

          const merchantSession = await response.json();
          session.completeMerchantValidation(merchantSession);
        } catch (error) {
          session.abort();
          throw error;
        }
      };

      session.onpaymentauthorized = async (event: any) => {
        try {
          // 4. Processar pagamento via PayPal
          const response = await fetch('/api/payments/apple-pay/process-paypal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id,
              payment_token: event.payment.token,
              amount,
              currency,
            }),
          });

          if (!response.ok) throw new Error('Falha ao processar pagamento');
          
          const result = await response.json();

          session.completePayment({
            status: (window as any).ApplePaySession.STATUS_SUCCESS,
          });

          onSuccess?.(result);
        } catch (error) {
          session.completePayment({
            status: (window as any).ApplePaySession.STATUS_FAILURE,
          });
          onError?.(error);
        } finally {
          setIsProcessing(false);
        }
      };

      session.oncancel = () => {
        setIsProcessing(false);
        onError?.(new Error('Pagamento cancelado'));
      };

      session.begin();
    } catch (error) {
      setIsProcessing(false);
      onError?.(error);
    }
  }

  return {
    isAvailable,
    isProcessing,
    initiatePayment,
  };
}
