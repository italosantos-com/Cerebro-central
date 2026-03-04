"use client";

import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useStrictAuthCheck } from '@/hooks/useStrictAuthCheck';

interface PayPalHostedButtonProps {
    onPaymentSuccess: () => void;
    amount?: string;
    currency?: string;
    description?: string;
    className?: string;
}

interface PayPalHostedButtonRef {
    triggerPayment: () => void;
}

const PayPalButtonWrapper = ({ 
    onPaymentSuccess, 
    amount = "10.00", 
    currency = "BRL", 
    description = "Pagamento" 
}: PayPalHostedButtonProps) => {
    const [{ isPending, isRejected }] = usePayPalScriptReducer();
    const { toast } = useToast();
    const router = useRouter();
    const { authStatus, getUserEmail, requireAuthOrRedirect } = useStrictAuthCheck();

    // Lógica de autenticação extraída para useStrictAuthCheck

    const handleAuthenticationRequired = () => {
        requireAuthOrRedirect();
    };

    // Se está verificando autenticação, mostrar loading
    if (authStatus === 'checking') {
        return (
            <div className="flex items-center justify-center p-4 min-h-[50px]">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="ml-2 text-blue-600">Verificando autenticação...</span>
            </div>
        );
    }

    // Se não está autenticado, mostrar botão de login
    if (authStatus === 'unauthenticated') {
        return (
            <Button
                onClick={handleAuthenticationRequired}
                className="w-full h-[50px] bg-red-600 hover:bg-red-700 text-white"
            >
                <AlertTriangle className="h-4 w-4 mr-2" />
                🔐 Faça Login para Assinar com PayPal
            </Button>
        );
    }

    if (isPending) {
        return (
            <div className="flex items-center justify-center p-4 min-h-[50px]">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="ml-2 text-blue-600">Carregando PayPal...</span>
            </div>
        );
    }

    if (isRejected) {
        return (
            <div className="flex flex-col items-center justify-center p-4 min-h-[50px] text-red-500 gap-2">
                <span>⚠️ Erro ao carregar PayPal</span>
                <Button
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => {
                        // Forçar recarregamento do script PayPal refechendo a página ou limpando estado
                        window.location.reload();
                    }}
                >
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    return (
        <PayPalButtons
            style={{
                layout: "vertical",
                color: "white",
                shape: "rect",
                label: "paypal",
                height: 50,
                tagline: false,
            }}
            createOrder={async (data, actions) => {
                // VERIFICAÇÃO DUPLA DE SEGURANÇA
                if (authStatus !== 'authenticated' || !requireAuthOrRedirect()) {
                    console.error('[PayPal Hosted] Usuário não autenticado durante createOrder');
                    throw new Error('Usuário não autenticado');
                }

                const userEmailValue = getUserEmail();
                if (!userEmailValue) {
                    console.error('[PayPal Hosted] Email não encontrado durante createOrder');
                    handleAuthenticationRequired();
                    throw new Error('Email do usuário é obrigatório');
                }

                try {
                    const response = await fetch('/api/paypal/create-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            amount: amount,
                            currency: currency,
                            description: description,
                            buyerEmail: userEmailValue, // Usar email autenticado
                        }),
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        return result.orderId;
                    } else {
                        throw new Error(result.error || 'Erro ao criar pedido');
                    }
                } catch (error) {
                    console.error('Erro ao criar pedido:', error);
                    throw error;
                }
            }}
            onApprove={async (data, actions) => {
                // VERIFICAÇÃO DUPLA DE SEGURANÇA
                if (authStatus !== 'authenticated' || !requireAuthOrRedirect()) {
                    console.error('[PayPal Hosted] Usuário não autenticado durante onApprove');
                    return;
                }

                const userEmailValue = getUserEmail();
                if (!userEmailValue) {
                    console.error('[PayPal Hosted] Email não encontrado durante onApprove');
                    handleAuthenticationRequired();
                    return;
                }

                try {
                    // Capturar o pagamento usando nossa API
                    const response = await fetch('/api/paypal/capture-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId: data.orderID,
                            buyerEmail: userEmailValue, // Usar email autenticado
                        }),
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        console.log("PayPal payment completed:", result);
                        
                        toast({
                            title: "✅ Pagamento PayPal Aprovado!",
                            description: `Transação: ${result.paymentId}`,
                            duration: 5000,
                        });
                        
                        onPaymentSuccess();
                    } else {
                        throw new Error(result.error || 'Erro ao capturar pagamento');
                    }
                } catch (error) {
                    console.error("Erro ao capturar pagamento:", error);
                    toast({
                        variant: "destructive",
                        title: "❌ Erro no Pagamento",
                        description: "Não foi possível processar o pagamento.",
                    });
                }
            }}
            onError={(err) => {
                console.error("PayPal error:", err);
                toast({
                    variant: "destructive",
                    title: "❌ Erro do PayPal",
                    description: "Ocorreu um erro durante o processamento. Tente novamente em instantes.",
                });
            }}
            onCancel={() => {
                toast({
                    title: "⚠️ Pagamento Cancelado",
                    description: "O pagamento foi cancelado pelo usuário.",
                });
            }}
        />
    );
};

const PayPalHostedButton = forwardRef<PayPalHostedButtonRef, PayPalHostedButtonProps>(({ 
    onPaymentSuccess, 
    amount = "10.00", 
    currency = "BRL", 
    description = "Pagamento",
    className 
}, ref) => {
    const [showPayPal, setShowPayPal] = useState(false);
    
    useImperativeHandle(ref, () => ({
        triggerPayment: () => {
            setShowPayPal(true);
        }
    }));

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    if (!clientId) {
        return (
            <div className={cn("w-full p-4 rounded border border-red-300 bg-red-50 text-red-700 text-sm", className)}>
                ⚠️ Configuração PayPal ausente: defina variável de ambiente NEXT_PUBLIC_PAYPAL_CLIENT_ID.
            </div>
        );
    }

    const paypalOptions = {
        clientId: clientId,
        currency: currency,
        intent: "capture",
        components: "buttons",
        "enable-funding": "paylater,venmo",
        "disable-funding": "card,credit",
        // Ambiente sandbox já implícito pelo clientId; remover flags redundantes
    };

    if (!showPayPal) {
        return (
            <Button
                onClick={() => setShowPayPal(true)}
                className={cn("w-full bg-[#0070ba] hover:bg-[#005ea6] text-white", className)}
            >
                <CreditCard className="w-4 h-4 mr-2" />
                Pagar com PayPal
            </Button>
        );
    }

    return (
        <div className={cn("w-full", className)}>
            <PayPalScriptProvider options={paypalOptions}>
                <PayPalButtonWrapper
                    onPaymentSuccess={onPaymentSuccess}
                    amount={amount}
                    currency={currency}
                    description={description}
                />
            </PayPalScriptProvider>
        </div>
    );
});

PayPalHostedButton.displayName = "PayPalHostedButton";

export default PayPalHostedButton;
export type { PayPalHostedButtonProps, PayPalHostedButtonRef };
