"use client";

import dynamic from 'next/dynamic';
const PayPalButtonsV5 = dynamic(() => import('@/components/paypal-buttons-v5'), { ssr: false });

export default function PayPalItaloDemoPage() {
  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Demo: PayPal (modelo Italo)</h1>
      <div className="border rounded-md p-4">
        <p className="mb-2">Pagamento de teste (R$ 99,00)</p>
        <PayPalButtonsV5
          amount={99}
          description="Assinatura Mensal - Demo"
          onSuccess={() => {}}
          onError={() => {}}
        />
      </div>
    </main>
  );
}
