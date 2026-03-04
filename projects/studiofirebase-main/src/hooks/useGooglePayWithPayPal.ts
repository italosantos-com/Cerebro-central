'use client';

import { useEffect, useState } from 'react';
import { PAYMENT_CONFIG } from '@/config/payment-methods.config';

interface UseGooglePayWithPayPalOptions {
  amount: string;
  currency?: string;
  onSuccess?: (payment: any) => void;
  onError?: (error: any) => void;
}

export function useGooglePayWithPayPal({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
}: UseGooglePayWithPayPalOptions) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentsClient, setPaymentsClient] = useState<any>(null);

  useEffect(() => {
    loadGooglePayScript();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas na montagem

  async function loadGooglePayScript() {
    if (typeof window === 'undefined') return;

    // Carregar Google Pay API
    const script = document.createElement('script');
    script.src = 'https://pay.google.com/gp/p/js/pay.js';
    script.async = true;
    script.onload = () => initializeGooglePay();
    document.head.appendChild(script);
  }

  async function initializeGooglePay() {
    if (!window.google?.payments?.api?.PaymentsClient) return;

    const client = new window.google.payments.api.PaymentsClient({
      environment: PAYMENT_CONFIG.googlePay.environment,
    });

    setPaymentsClient(client);

    try {
      const paymentDataRequest = getGooglePaymentDataRequest();
      const isReadyToPay = await client.isReadyToPay({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: JSON.parse(JSON.stringify(paymentDataRequest.allowedPaymentMethods)),
      });

      setIsAvailable(isReadyToPay.result);
    } catch (error) {
      console.error('Erro ao verificar Google Pay:', error);
      setIsAvailable(false);
    }
  }

  function getGooglePaymentDataRequest() {
    return {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: PAYMENT_CONFIG.googlePay.allowedCardAuthMethods,
            allowedCardNetworks: PAYMENT_CONFIG.googlePay.allowedCardNetworks,
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'paypal',
              gatewayMerchantId: PAYMENT_CONFIG.googlePay.paypalConfig.clientId,
            },
          },
        },
      ],
      merchantInfo: {
        merchantId: PAYMENT_CONFIG.googlePay.merchantInfo.merchantId,
        merchantName: PAYMENT_CONFIG.googlePay.merchantInfo.merchantName,
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPriceLabel: 'Total',
        totalPrice: amount,
        currencyCode: currency,
        countryCode: 'US',
      },
      callbackIntents: ['PAYMENT_AUTHORIZATION'],
    };
  }

  async function initiatePayment() {
    if (!isAvailable || !paymentsClient || isProcessing) return;

    setIsProcessing(true);

    try {
      // 1. Criar ordem no PayPal
      const orderResponse = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          payment_method: 'google_pay',
        }),
      });

      if (!orderResponse.ok) throw new Error('Falha ao criar ordem PayPal');
      const { order_id } = await orderResponse.json();

      // 2. Solicitar dados de pagamento do Google Pay
      const paymentDataRequest = getGooglePaymentDataRequest();
      
      paymentDataRequest.callbackIntents = ['PAYMENT_AUTHORIZATION'];
      (paymentDataRequest as any).paymentDataCallbacks = {
        onPaymentAuthorized: async (paymentData: any) => {
          try {
            // 3. Processar pagamento via PayPal
            const response = await fetch('/api/payments/google-pay/process-paypal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id,
                payment_data: paymentData,
                amount,
                currency,
              }),
            });

            if (!response.ok) throw new Error('Falha ao processar pagamento');
            
            const result = await response.json();

            return {
              transactionState: 'SUCCESS',
            };
          } catch (error) {
            return {
              transactionState: 'ERROR',
              error: {
                intent: 'PAYMENT_AUTHORIZATION',
                message: 'Falha ao processar pagamento',
                reason: 'PAYMENT_DATA_INVALID',
              },
            };
          }
        },
      };

      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);

      // 4. Sucesso
      onSuccess?.(paymentData);
    } catch (error: any) {
      if (error.statusCode === 'CANCELED') {
        onError?.(new Error('Pagamento cancelado'));
      } else {
        onError?.(error);
      }
    } finally {
      setIsProcessing(false);
    }
  }

  return {
    isAvailable,
    isProcessing,
    initiatePayment,
    paymentsClient,
  };
}
