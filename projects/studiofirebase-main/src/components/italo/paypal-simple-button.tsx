'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

export type PayPalSimpleButtonProps = {
  amount: number | string;
  currency?: string; // default BRL
  description?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
};

const PayPalButtonsV5 = dynamic(() => import('@/components/paypal-buttons-v5'), { ssr: false });

export default function PayPalSimpleButton({ amount, currency = 'BRL', description, onSuccess, onError }: PayPalSimpleButtonProps) {
  const [loading, setLoading] = useState(false);

  const fmtAmount = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return (isNaN(num) ? 0 : num).toFixed(2);
  };

  const amt = parseFloat(fmtAmount(amount));
  return (
    <div style={{ width: '100%' }}>
      <PayPalButtonsV5
        amount={isNaN(amt) ? 0 : amt}
        currency={currency}
        description={description || 'Pagamento via PayPal'}
        onSuccess={(details) => onSuccess?.(details)}
        onError={(err) => onError?.(err)}
      />
    </div>
  );
}
