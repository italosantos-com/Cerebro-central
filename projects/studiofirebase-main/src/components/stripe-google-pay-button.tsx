import React, { useEffect, useRef } from 'react';
import { STRIPE_CONFIG } from '@/lib/stripe-config';

interface StripeGooglePayButtonProps {
  amount: number;
  currency: string;
  onSuccess: () => void;
  className?: string;
}

const StripeGooglePayButton: React.FC<StripeGooglePayButtonProps> = ({ amount, currency, onSuccess, className }) => {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.google?.payments?.api?.PaymentsClient) return;

    const paymentsClient = new window.google.payments.api.PaymentsClient({
      environment: STRIPE_CONFIG.googlePay.environment === 'TEST' ? 'TEST' : 'PRODUCTION',
    });

    const cardPaymentMethod: any = {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX'],
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: 'stripe',
          'stripe:publishableKey': STRIPE_CONFIG.publicKey,
        },
      },
    };

    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [cardPaymentMethod],
      merchantInfo: {
        merchantId: STRIPE_CONFIG.googlePay.merchantId,
        merchantName: STRIPE_CONFIG.googlePay.merchantName,
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: amount.toFixed(2),
        currencyCode: currency,
        countryCode: 'BR',
      },
    };

    paymentsClient.isReadyToPay({
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [cardPaymentMethod as any],
    }).then(function (response: any) {
      if (response.result) {
        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
          buttonRef.current.appendChild(
            paymentsClient.createButton({
              onClick: async () => {
                try {
                  const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest as any);
                  // Envie o token para o backend Stripe
                  const token = paymentData.paymentMethodData.tokenizationData.token;
                  await fetch('/api/stripe-googlepay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, amount, currency })
                  });
                  onSuccess();
                } catch (err) {
                  console.error('Erro no Google Pay:', err);
                }
              },
            })
          );
        }
      }
    });
  }, [amount, currency, onSuccess]);

  return <div ref={buttonRef} className={className} />;
};

export default StripeGooglePayButton;
