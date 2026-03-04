import StripeConnectAuth from '@/components/StripeConnectAuth';
import { Suspense } from 'react';

export const metadata = {
  title: 'Stripe Connect - Conecte sua conta',
  description: 'Conecte sua conta Stripe para gerenciar pagamentos'
};

export default function StripeConnectPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Stripe Connect
          </h1>
          <p className="text-lg text-gray-600">
            Gerencie seus pagamentos e transações
          </p>
        </div>
        
        <Suspense fallback={
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        }>
          <StripeConnectAuth />
        </Suspense>
      </div>
    </div>
  );
}
