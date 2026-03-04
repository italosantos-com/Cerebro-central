
"use client";

import { Wallet, initMercadoPago } from '@mercadopago/sdk-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import PixPaymentModal from './pix-payment-modal';
import PayPalButton from './paypal-buttons-v5';
import { Button } from './ui/button';
import { CreditCard, Smartphone, Apple } from 'lucide-react';

interface PaymentButtonsProps {
    onPaymentSuccess: () => void;
    amount: number;
    currency: string;
}

export default function PaymentButtons({ onPaymentSuccess, amount, currency }: PaymentButtonsProps) {
    const { toast } = useToast();
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    
    // Chaves de produção - apenas variáveis de ambiente
    const mercadoPagoPublicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
    
    useEffect(() => {
        if (mercadoPagoPublicKey) {
            initMercadoPago(mercadoPagoPublicKey, { locale: 'pt-BR' });
        }
    }, [mercadoPagoPublicKey]);
    
    useEffect(() => {
        // Criar preferência de pagamento
        const createPreference = async () => {
            try {
                const response = await fetch('/api/create-preference', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        amount,
                        currency,
                        description: 'Assinatura Premium'
                    }),
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setPreferenceId(data.preferenceId);
                } else {
                    throw new Error('Falha ao criar preferência de pagamento');
                }
            } catch (error) {
                // Em produção, não mostrar detalhes do erro
                if (process.env.NODE_ENV === 'development') {
                    console.error('Erro ao criar preferência:', error);
                }
                setPreferenceId(null);
            }
        };
        
        createPreference();
    }, [amount, currency]);



    const handleGooglePayClick = () => {
        // Verificar se está em dispositivo Android ou se Google Pay está disponível
        const isAndroid = /Android/i.test(navigator.userAgent);
        const hasGooglePay = 'google' in window && 'payments' in (window as any).google;
        
        if (hasGooglePay) {
            toast({
                title: 'Google Pay',
                description: 'Redirecionando para Google Pay...',
            });
            // Aqui você implementaria a integração real do Google Pay
        } else if (isAndroid) {
            // Redirecionar para Google Play Store para baixar Google Pay
            window.open('https://play.google.com/store/apps/details?id=com.google.android.apps.nfc.payment', '_blank');
        } else {
            toast({
                title: 'Google Pay',
                description: 'Google Pay não está disponível neste dispositivo. Use PIX (disponível globalmente) ou PayPal.',
            });
        }
    };

    const handleApplePayClick = () => {
        // Verificar se está em dispositivo Apple e se Apple Pay está disponível
        const isAppleDevice = /iPad|iPhone|iPod|Mac/.test(navigator.userAgent);
        const hasApplePay = 'ApplePaySession' in window && (window as any).ApplePaySession?.canMakePayments();
        
        if (hasApplePay) {
            toast({
                title: 'Apple Pay',
                description: 'Redirecionando para Apple Pay...',
            });
            // Aqui você implementaria a integração real do Apple Pay
        } else if (isAppleDevice) {
            // Redirecionar para App Store para configurar Apple Pay
            window.open('https://apps.apple.com/app/apple-pay/id', '_blank');
        } else {
            toast({
                title: 'Apple Pay',
                description: 'Apple Pay não está disponível neste dispositivo. Use PIX ou PayPal.',
            });
        }
    };

    const handlePixClick = () => {
        // PIX agora disponível globalmente, mas sempre processa em BRL
        if (currency !== 'BRL') {
            toast({
                title: 'PIX Disponível!',
                description: 'PIX será processado em BRL (Reais brasileiros). Valor convertido automaticamente.',
            });
        }
        setIsPixModalOpen(true);
    };

    if (!preferenceId) {
        return <div className="h-[72px] flex items-center justify-center"><p className="text-sm text-muted-foreground">Carregando pagamentos...</p></div>;
    }

    return (
        <div className="space-y-1 w-full max-w-sm">
            {/* PayPal - Primeiro botão (principal) */}
            <div className="w-full">
                <PayPalButton
                    onSuccess={onPaymentSuccess}
                    amount={amount}
                    currency={currency}
                    description="Acesso Premium"
                />
            </div>

            {/* Outros métodos de pagamento */}
            <div className="flex justify-around items-center w-full gap-1.5">
                <div className="flex-1">
                    <button 
                        className="w-full bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg px-4 py-3 transition-all duration-200 flex items-center justify-center gap-2 text-gray-800 font-medium"
                        onClick={handleGooglePayClick}
                        aria-label="Pagar com Google Pay"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/>
                        </svg>
                        <span className="text-sm">Google Pay</span>
                    </button>
                </div>
                
                <div className="flex-shrink-0">
                    <button 
                        className="bg-gray-900 hover:bg-gray-700 text-white rounded-lg p-3 transition-all duration-200 flex items-center justify-center" 
                        onClick={handlePixClick}
                        aria-label="Pagar com PIX"
                    >
                        <svg width="28" height="28" viewBox="0 0 512 512" fill="currentColor">
                            <path d="M242.4 292.5C247.8 287.1 251.4 280.8 251.4 273.6s-3.6-13.5-9-18.9L208.8 220l33.6-34.7c5.4-5.4 9-12.7 9-19.9s-3.6-14.5-9-19.9c-5.4-5.4-12.7-9-19.9-9s-14.5 3.6-19.9 9L168 180.3 133.4 145.6c-5.4-5.4-12.7-9-19.9-9s-14.5 3.6-19.9 9c-5.4 5.4-9 12.7-9 19.9s3.6 14.5 9 19.9L127.2 220l-33.6 34.7c-5.4 5.4-9 12.7-9 19.9s3.6 14.5 9 19.9c5.4 5.4 12.7 9 19.9 9s14.5-3.6 19.9-9L168 259.8l34.6 34.7c5.4 5.4 12.7 9 19.9 9s14.5-3.6 19.9-9z"/>
                        </svg>
                    </button>
                </div>

                <div className="flex-1">
                    <button 
                        className="w-full bg-gray-900 hover:bg-gray-700 text-white border border-gray-700 rounded-lg px-4 py-3 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                        onClick={handleApplePayClick}
                        aria-label="Pagar com Apple Pay"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                        <span className="text-sm">Apple Pay</span>
                    </button>
                </div>
            </div>

            {/* MercadoPago - Link direto para checkout */}
            {preferenceId && (
                <div className="w-full">
                    <Button
                        onClick={() => {
                            window.open(`https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceId}`, '_blank');
                        }}
                        className="w-full bg-[#009ee3] hover:bg-[#0087c7] text-white"
                    >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pagar com MercadoPago
                    </Button>
                </div>
            )}

            <PixPaymentModal
                isOpen={isPixModalOpen}
                onOpenChange={setIsPixModalOpen}
                amount={amount}
                onPaymentSuccess={onPaymentSuccess}
            />
        </div>
    );
}
