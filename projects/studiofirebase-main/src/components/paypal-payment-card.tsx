"use client";

import { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PayPalPaymentProps {
    amount: string;
    description: string;
    onPaymentSuccess: (details: any) => void;
    onPaymentError?: (error: any) => void;
}

const PayPalButtonComponent = ({ amount, description, onPaymentSuccess, onPaymentError }: PayPalPaymentProps) => {
    const [{ isPending }] = usePayPalScriptReducer();
    const { toast } = useToast();

    if (isPending) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Carregando PayPal...</span>
            </div>
        );
    }

    return (
        <PayPalButtons
            style={{
                layout: "vertical",
                color: "blue",
                shape: "rect",
                label: "paypal",
                height: 50,
            }}
            createOrder={(data, actions) => {
                return actions.order.create({
                    purchase_units: [
                        {
                            amount: {
                                value: amount,
                                currency_code: "BRL",
                            },
                            description: description,
                        },
                    ],
                    intent: "CAPTURE",
                });
            }}
            onApprove={async (data, actions) => {
                try {
                    const details = await actions.order?.capture();
                    console.log("PayPal payment completed:", details);
                    
                    toast({
                        title: "✅ Pagamento Aprovado!",
                        description: `Transação: ${details?.id}`,
                    });
                    
                    onPaymentSuccess(details);
                } catch (error) {
                    console.error("Erro ao capturar pagamento:", error);
                    toast({
                        variant: "destructive",
                        title: "❌ Erro no Pagamento",
                        description: "Não foi possível processar o pagamento.",
                    });
                    onPaymentError?.(error);
                }
            }}
            onError={(err) => {
                console.error("PayPal error:", err);
                toast({
                    variant: "destructive",
                    title: "❌ Erro do PayPal",
                    description: "Ocorreu um erro durante o processamento.",
                });
                onPaymentError?.(err);
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

interface PayPalPaymentCardProps {
    amount: string;
    title: string;
    description: string;
    features?: string[];
    onPaymentSuccess: (details: any) => void;
    className?: string;
}

export default function PayPalPaymentCard({ 
    amount, 
    title, 
    description, 
    features = [], 
    onPaymentSuccess,
    className = ""
}: PayPalPaymentCardProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePaymentSuccess = (details: any) => {
        setIsProcessing(false);
        onPaymentSuccess(details);
    };

    const handlePaymentError = (error: any) => {
        setIsProcessing(false);
        console.error("Payment error:", error);
    };

    const paypalOptions = {
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: "BRL",
        intent: "capture" as const,
        components: "buttons",
        "disable-funding": "venmo,card",
        // Forçar ambiente de teste
        "data-env": "sandbox",
    };

    return (
        <Card className={`w-full max-w-md ${className}`}>
            <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-bold">{title}</CardTitle>
                <div className="text-3xl font-bold text-primary">
                    R$ {parseFloat(amount).toFixed(2)}
                </div>
                <p className="text-muted-foreground">{description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
                {features.length > 0 && (
                    <ul className="space-y-1.5">
                        {features.map((feature, index) => (
                            <li key={index} className="flex items-center">
                                <span className="text-green-500 mr-2">✓</span>
                                {feature}
                            </li>
                        ))}
                    </ul>
                )}
                
                <div className="pt-2">
                    <PayPalScriptProvider options={paypalOptions}>
                        <PayPalButtonComponent
                            amount={amount}
                            description={`${title} - ${description}`}
                            onPaymentSuccess={handlePaymentSuccess}
                            onPaymentError={handlePaymentError}
                        />
                    </PayPalScriptProvider>
                </div>
                
                <div className="text-xs text-center text-muted-foreground">
                    <p>🔒 Pagamento seguro via PayPal</p>
                    <p>💳 Aceita cartões de crédito e débito</p>
                </div>
            </CardContent>
        </Card>
    );
}
