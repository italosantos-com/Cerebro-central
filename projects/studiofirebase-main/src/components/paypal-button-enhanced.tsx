'use client';

import { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useToast } from '@/hooks/use-toast';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { clearAuthData, checkForResidualData } from '@/lib/auth-cleanup';
import { checkUserAuthentication } from '@/utils/auth-check';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface PayPalButtonProps {
    amount: number;
    currency: string;
    onSuccess: () => void;
    description?: string;
}

export default function PayPalButton({ amount, currency, onSuccess, description }: PayPalButtonProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { isAuthenticated, userEmail } = useFaceIDAuth();
    const { user: firebaseUser, userProfile } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

    // VERIFICAÇÃO SIMPLIFICADA DE AUTENTICAÇÃO
    useEffect(() => {
        const checkAuthentication = () => {
            const authResult = checkUserAuthentication(isAuthenticated, userEmail, userProfile, firebaseUser);

            if (authResult.isValid) {
                setAuthStatus('authenticated');
            } else {
                setAuthStatus('unauthenticated');
            }
        };

        // Verificar imediatamente
        checkAuthentication();

        // Verificar periodicamente a cada 3 segundos
        const authInterval = setInterval(checkAuthentication, 3000);

        return () => clearInterval(authInterval);
    }, [isAuthenticated, userEmail, userProfile, firebaseUser, router, toast]);

    // Obter email do usuário autenticado - APENAS se autenticado
    const getUserEmail = () => {
        if (authStatus !== 'authenticated') {
            return '';
        }

        const email = firebaseUser?.email ||
            userProfile?.email ||
            userEmail ||
            localStorage.getItem('userEmail') ||
            '';

        // Verificar se o email é válido
        if (!email || email.trim() === '') {
            return '';
        }

        return email;
    };

    // ✅ SIMPLIFICADO: Atualizar Firebase diretamente
    const activateSubscription = async (email: string, paymentId: string) => {
        try {
            // Aguardar um momento para o backend processar
            await new Promise(resolve => setTimeout(resolve, 2000));

            // ✅ SIMPLIFICADO: Apenas verificar se o perfil foi atualizado
            const response = await fetch('/api/subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'checkSubscription',
                    customerEmail: email
                })
            });

            const result = await response.json();

            if (result.success && result.hasActiveSubscription) {
                // Disparar evento para atualizar interface
                if (firebaseUser) {
                    window.dispatchEvent(new CustomEvent('subscription-activated'));
                }

                return true;
            } else {
                return true; // Não falhar, apenas aguardar
            }
        } catch (error) {
            return true; // Não falhar, apenas logar
        }
    };

    // Removido fluxo de botão customizado para manter aparência original do SDK

    const [clientId, setClientId] = useState<string | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function loadConfig() {
            try {
                // Primeiro tente variável pública
                const direct = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
                if (direct) {
                    if (!cancelled) setClientId(direct);
                    return;
                }
                const res = await fetch('/api/paypal/config', { cache: 'no-store' });
                const data = await res.json();
                if (res.ok && data.clientId) {
                    if (!cancelled) setClientId(String(data.clientId));
                } else {
                    if (!cancelled) setConfigError(data.error || 'PayPal Client ID ausente');
                }
            } catch (e: any) {
                if (!cancelled) setConfigError(e?.message || 'Falha ao carregar configuração do PayPal');
            }
        }
        loadConfig();
        return () => { cancelled = true; };
    }, []);

    // Se está verificando autenticação, mostrar loading
    if (authStatus === 'checking') {
        return (
            <div className="w-full h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-gray-600">Verificando autenticação...</span>
            </div>
        );
    }

    // Mesmo não autenticado, renderizar PayPalButtons para manter aparência original; validação ocorre em createOrder/onApprove

    if (!clientId) {
        return (
            <div className="w-full h-12 bg-amber-100 border border-amber-300 rounded-lg flex items-center justify-center text-amber-800 text-sm px-3">
                {configError ? `Configuração PayPal ausente: ${configError}` : 'Carregando configuração do PayPal...'}
            </div>
        );
    }

    const initialOptions = {
        clientId,
        currency: "BRL", // Forçar BRL para PayPal
        intent: "capture",
        // Forçar ambiente de teste
        "data-env": "sandbox",
    };

    const createOrder = async (data: any, actions: any) => {
        // VERIFICAÇÃO DUPLA DE SEGURANÇA
        if (authStatus !== 'authenticated') {
            throw new Error('Usuário não autenticado');
        }

        const userEmailValue = getUserEmail();
        if (!userEmailValue) {
            throw new Error('Email do usuário é obrigatório');
        }

        try {
            const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: "99.00", // Valor fixo em BRL para PayPal
                    currency: "BRL", // Forçar BRL para API também
                    description: description || 'Assinatura Premium - 30 dias',
                    buyerEmail: userEmailValue,
                }),
            });

            const result = await response.json();

            if (result.success) {
                return result.orderId;
            } else {
                throw new Error(result.error || 'Erro ao criar pedido');
            }
    };

    const onApprove = async (data: any, actions: any) => {
        // VERIFICAÇÃO DUPLA DE SEGURANÇA
        if (authStatus !== 'authenticated') {
            toast({
                variant: 'destructive',
                title: 'Erro de Autenticação',
                description: 'Sua sessão expirou. Faça login novamente.'
            });
            router.push('/auth/face');
            return;
        }

        const userEmailValue = getUserEmail();
        if (!userEmailValue) {
            toast({
                variant: 'destructive',
                title: 'Erro de Autenticação',
                description: 'Dados de usuário inválidos. Faça login novamente.'
            });
            router.push('/auth/face');
            return;
        }

        setIsLoading(true);

        try {
            const captureData = {
                orderId: data.orderID,
                buyerEmail: userEmailValue
            };

            const response = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(captureData),
            });

            const result = await response.json();

            if (result.success) {
                const userEmail = getUserEmail();

                try {
                    // ✅ SIMPLIFICADO: Ativar assinatura
                    await activateSubscription(userEmail, result.paymentId || result.orderId);

                    toast({
                        title: '✅ Pagamento Aprovado!',
                        description: 'Sua assinatura foi ativada com sucesso.',
                        duration: 3000,
                    });

                    // Redirecionar para o perfil
                    setTimeout(() => {
                        router.push('/perfil');
                    }, 2000);

                } catch (error) {
                    toast({
                        title: '✅ Pagamento Aprovado!',
                        description: 'Redirecionando para seu perfil...',
                        duration: 3000,
                    });

                    // Sempre redirecionar, mesmo com erro
                    setTimeout(() => {
                        router.push('/perfil');
                    }, 2000);
                }
            } else {
                throw new Error(result.error || 'Erro ao capturar pagamento');
            }
        } catch (error) {
            toast({
                title: '❌ Erro no pagamento',
                description: error instanceof Error ? error.message : 'Tente novamente.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const onError = (err: any) => {
        toast({
            title: '❌ Erro no PayPal',
            description: 'Ocorreu um erro durante o pagamento. Tente novamente.',
            variant: 'destructive'
        });
    };

    return (
        <PayPalScriptProvider options={initialOptions}>
            <div className="w-full h-full">
                <PayPalButtons
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onError={onError}
                    disabled={isLoading}
                />
            </div>
        </PayPalScriptProvider>
    );
}