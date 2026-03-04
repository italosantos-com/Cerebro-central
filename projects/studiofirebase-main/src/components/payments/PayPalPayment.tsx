import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

interface PayPalPaymentProps {
  amount: string;
  currency?: string;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}

const PayPalPayment: React.FC<PayPalPaymentProps> = ({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const PayPalButtonsV5 = dynamic(() => import('@/components/paypal-buttons-v5'), { ssr: false });

  const onSuccessHandler = (details: any) => {
    setLoading(false);
    onSuccess?.(details);
  };

  const onErrorHandler = (error: any) => {
    console.error('PayPal error:', error);
    setLoading(false);
    onError?.(error);
  };

  if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 rounded">
        <p className="text-red-700">PayPal Client ID não configurado</p>
      </div>
    );
  }

  return (
    <div className="paypal-container">
      {loading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2">Processando pagamento...</span>
        </div>
      )}
      
      <PayPalButtonsV5
        amount={amount}
        currency={currency}
        description={`Pagamento de ${amount} ${currency}`}
        onSuccess={(data: any) => {
          console.log('[PayPal Payment v5] Success:', data);
          toast({ title: 'Pagamento aprovado!', description: `ID: ${data?.id}` });
          onSuccess?.(data);
        }}
        onError={(error: any) => {
          console.error('[PayPal Payment v5] Error:', error);
          toast({ variant: 'destructive', title: 'Erro no PayPal', description: 'Falha no processamento.' });
          onError?.(error);
        }}
        className="mt-4"
      />
      
      <style jsx>{`
        .paypal-container :global(.paypal-buttons) {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default PayPalPayment;
