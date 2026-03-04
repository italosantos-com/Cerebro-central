import React, { useEffect, useState } from 'react';
import { loadScript } from '@/utils/script-loader';

interface MercadoPagoPaymentProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess?: (payment: any) => void;
  onError?: (error: any) => void;
  onPending?: (payment: any) => void;
}

const MercadoPagoPayment: React.FC<MercadoPagoPaymentProps> = ({
  amount,
  currency = 'BRL',
  description = 'Pagamento',
  onSuccess,
  onError,
  onPending
}) => {
  const [mp, setMp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);

  useEffect(() => {
    const initMercadoPago = (): boolean => {
      if (typeof window !== 'undefined' && (window as any).MercadoPago) {
        const mercadopago = new (window as any).MercadoPago(
          process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
          {
            locale: 'pt-BR'
          }
        );
        setMp(mercadopago);
        setLoading(false);
        return true;
      }
      return false;
    };

    // Verificar se já está carregado
    if (initMercadoPago()) {
      return;
    }

    // Carregar script com segurança
    loadScript({
      src: 'https://sdk.mercadopago.com/js/v2',
      id: 'mercadopago-sdk',
      onLoad: () => initMercadoPago(),
      onError: (error) => {
        console.error('Erro ao carregar MercadoPago SDK:', error);
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Erro ao carregar MercadoPago SDK:', error);
      setLoading(false);
    });
  }, []);

  const createPreference = async () => {
    try {
      // Import device fingerprint utility
      const { getOrCreateDeviceId } = await import('@/lib/device-fingerprint');
      const deviceId = getOrCreateDeviceId();

      const response = await fetch('/api/payments/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
          metadata: {
            device_id: deviceId,
            source: 'web_checkout',
            timestamp: new Date().toISOString(),
          }
        }),
      });

      const data = await response.json();
      
      if (data.preferenceId) {
        setPreferenceId(data.preferenceId);
        return data.preferenceId;
      } else {
        throw new Error('Erro ao criar preferência');
      }
    } catch (error) {
      console.error('Erro ao criar preferência:', error);
      onError?.(error);
      return null;
    }
  };

  const handlePayment = async () => {
    if (!mp) return;

    try {
      setLoading(true);
      const prefId = await createPreference();
      
      if (prefId) {
        const checkout = mp.checkout({
          preference: {
            id: prefId
          },
          autoOpen: true
        });

        // Configurar callbacks
        checkout.on('payment', (payment: any) => {
          if (payment.status === 'approved') {
            onSuccess?.(payment);
          } else if (payment.status === 'pending') {
            onPending?.(payment);
          } else {
            onError?.(payment);
          }
        });

        checkout.on('error', (error: any) => {
          console.error('MercadoPago checkout error:', error);
          onError?.(error);
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erro no pagamento MercadoPago:', error);
      onError?.(error);
      setLoading(false);
    }
  };

  if (!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 rounded">
        <p className="text-red-700">MercadoPago Public Key não configurada</p>
      </div>
    );
  }

  return (
    <div className="mercadopago-container">
      <button
        onClick={handlePayment}
        disabled={loading || !mp}
        className={`w-full h-12 rounded-lg font-medium transition-colors ${
          loading || !mp
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Carregando...
          </div>
        ) : (
          <>
            💳 Pagar com MercadoPago
          </>
        )}
      </button>

      <div className="text-center mt-2">
        <p className="text-sm text-gray-600">
          {currency} {amount.toFixed(2)}
        </p>
      </div>

      <style jsx>{`
        .mercadopago-container {
          max-width: 400px;
        }
      `}</style>
    </div>
  );
};

export default MercadoPagoPayment;
