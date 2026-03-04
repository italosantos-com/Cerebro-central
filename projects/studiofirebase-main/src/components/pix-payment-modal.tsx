
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, ClipboardCopy, ShieldCheck, User, Mail, AlertTriangle, CreditCard } from "lucide-react";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from '@/components/ui/alert';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { convertCurrency } from '@/ai/flows/currency-conversion-flow';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { clearAuthData, checkForResidualData, isUserReallyAuthenticated } from '@/lib/auth-cleanup';
import { checkUserAuthentication, showAuthError } from '@/utils/auth-check';
import { activateLocalSubscription } from '@/utils/unified-auth-system';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
// REMOVIDO: Não usar biblioteca externa para QR Code
// O Mercado Pago já fornece o QR Code oficial

interface PixPaymentModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    amount: number;
    onPaymentSuccess: () => void;
    paymentMethod?: 'pix' | 'google' | 'apple';
    currency?: string;
    originalAmountBRL?: number;
}

export default function PixPaymentModal({ isOpen, onOpenChange, amount, onPaymentSuccess, paymentMethod, currency = 'BRL', originalAmountBRL }: PixPaymentModalProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { userEmail, userType, isAuthenticated } = useFaceIDAuth();
    const { userProfile, user: firebaseUser } = useAuth();
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pixData, setPixData] = useState<{ qrCodeBase64: string; qrCode: string; paymentId?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pixAmountBRL, setPixAmountBRL] = useState<number>(amount);
    const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
    const [pixSettings, setPixSettings] = useState<{ pixValue: number } | null>(null);
    const [generatedQRCode, setGeneratedQRCode] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationAttempts, setVerificationAttempts] = useState(0);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, userEmail, userProfile, isOpen, onOpenChange, router, toast]); // firebaseUser usado internamente

    // Obter dados do usuário autenticado - APENAS se autenticado
    const getUserData = () => {
        if (authStatus !== 'authenticated') {
            return { email: '', name: '' };
        }

        // Tentar obter dados do contexto Firebase primeiro
        const email = userProfile?.email || userEmail || localStorage.getItem('userEmail') || '';
        const name = userProfile?.displayName || localStorage.getItem('userName') || 'Usuário';

        // Verificar se o email é válido
        if (!email || email.trim() === '') {
            console.log('⚠️ [PIX Modal] Email inválido encontrado');
            return { email: '', name: '' };
        }

        return { email, name };
    };

    const { email, name } = getUserData();

    // Buscar configurações de PIX do admin
    useEffect(() => {
        const fetchPixSettings = async () => {
            try {
                const pathname = globalThis.window?.location?.pathname || null;
                const username = getPublicUsernameFromPathname(pathname);
                const url = username
                    ? `/api/admin/pix-settings?username=${encodeURIComponent(username)}`
                    : '/api/admin/pix-settings';

                const response = await fetch(url);
                const settings = await response.json();
                setPixSettings(settings);
            } catch (error) {
                console.error('Erro ao buscar configurações PIX:', error);
                setPixSettings({ pixValue: 99.00 });
            }
        };

        fetchPixSettings();
    }, []);

    // Calcular o valor correto em BRL para PIX
    useEffect(() => {
        const calculateBRLAmount = async () => {
            // Usar o valor configurado nas settings do admin se disponível
            if (pixSettings?.pixValue) {
                setPixAmountBRL(pixSettings.pixValue);
                return;
            }

            if (currency === 'BRL') {
                // Já está em BRL
                setPixAmountBRL(amount);
                return;
            }

            if (originalAmountBRL) {
                // Usar o valor BRL original se fornecido
                setPixAmountBRL(originalAmountBRL);
                return;
            }

            // Converter de volta para BRL usando Genkit
            try {
                const conversion = await convertCurrency({ targetLocale: 'pt-BR' });
                setPixAmountBRL(conversion.amount);
            } catch (error) {
                console.error('Erro ao converter para BRL:', error);
                // Fallback para 99.00 BRL se der erro
                setPixAmountBRL(99.00);
            }
        };

        calculateBRLAmount();
    }, [amount, currency, originalAmountBRL, pixSettings]);

    // Formatar CPF automaticamente
    const formatCPF = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    };

    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCPF(e.target.value);
        setCpf(formatted);
    };

    // Verificar se CPF é válido
    const isValidCPF = (cpf: string) => {
        const numbers = cpf.replace(/\D/g, '');
        return numbers.length === 11;
    };

    const handleGeneratePix = async () => {
        // VERIFICAÇÃO DUPLA DE SEGURANÇA
        if (authStatus !== 'authenticated') {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Você precisa estar logado para fazer o pagamento.'
            });
            router.push('/auth/face');
            return;
        }

        if (!email || email.trim() === '') {
            toast({
                variant: 'destructive',
                title: 'Email não encontrado',
                description: 'Faça login novamente para continuar.'
            });
            router.push('/auth/face');
            return;
        }

        // Validar CPF
        if (!cpf || !isValidCPF(cpf)) {
            toast({
                variant: 'destructive',
                title: 'CPF Inválido',
                description: 'Por favor, informe um CPF válido para continuar.'
            });
            return;
        }

        setIsLoading(true);
        setError(null);
        setPixData(null);

        try {
            // Usar APENAS a API oficial do Mercado Pago
            const response = await fetch('/api/pix/create-official', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    name,
                    amount: pixAmountBRL,
                    description: 'Assinatura VIP Studio',
                    cpf: cpf.replace(/\D/g, '') // Enviar apenas números
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erro ao criar PIX');
            }

            if (result.pixData?.qrCode) {
                setPixData({
                    qrCodeBase64: result.pixData.qrCodeBase64 || '',
                    qrCode: result.pixData.qrCode,
                    paymentId: result.paymentId
                });

                // Usar QR Code oficial do Mercado Pago
                if (result.pixData.qrCodeBase64) {
                    // Adicionar prefixo data:image/png;base64, se não estiver presente
                    const qrCodeData = result.pixData.qrCodeBase64.startsWith('data:')
                        ? result.pixData.qrCodeBase64
                        : `data:image/png;base64,${result.pixData.qrCodeBase64}`;
                    setGeneratedQRCode(qrCodeData);
                    console.log('✅ [PIX] QR Code oficial do Mercado Pago carregado');
                } else {
                    console.log('⚠️ [PIX] QR Code Base64 não encontrado, usando código PIX para gerar QR Code');
                    // Fallback: gerar QR Code manualmente usando o código PIX
                    try {
                        const QRCode = (await import('qrcode')).default as any;
                        const qrCodeDataURL = await QRCode.toDataURL(result.pixData.qrCode, {
                            width: 200,
                            margin: 2,
                            color: {
                                dark: '#000000',
                                light: '#FFFFFF'
                            }
                        });
                        setGeneratedQRCode(qrCodeDataURL);
                        console.log('✅ [PIX] QR Code gerado manualmente com sucesso');
                    } catch (error) {
                        console.error('❌ [PIX] Erro ao gerar QR Code manualmente:', error);
                        setGeneratedQRCode(null);
                    }
                }

                localStorage.setItem('customerEmail', email);
                localStorage.setItem('currentPixPaymentId', result.paymentId);
                localStorage.setItem('customerCPF', cpf.replace(/\D/g, ''));

                // Iniciar verificação automática após 5 segundos
                setTimeout(() => {
                    startAutomaticVerification();
                }, 5000);

            } else {
                throw new Error("Não foi possível obter os dados do PIX.");
            }
        } catch (e: any) {
            let errorMessage = 'Ocorreu um erro desconhecido.';

            if (e.message) {
                if (e.message.includes('network') || e.message.includes('fetch')) {
                    errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
                } else if (e.message.includes('timeout')) {
                    errorMessage = 'Tempo limite excedido. Tente novamente em alguns segundos.';
                } else if (e.message.includes('500') || e.message.includes('servidor')) {
                    errorMessage = 'Erro no servidor. Tente novamente em alguns minutos.';
                } else {
                    errorMessage = e.message;
                }
            }

            setError(errorMessage);
            toast({
                variant: 'destructive',
                title: 'Erro ao gerar PIX',
                description: errorMessage
            });
        } finally {
            setIsVerifying(false);
        }
    };

    // REMOVIDO: Função de gerar QR Code manualmente
    // O Mercado Pago já fornece o QR Code oficial em Base64
    const generateQRCode = async (pixCode: string) => {
        console.log('⚠️ [PIX] QR Code deve vir do Mercado Pago, não gerado manualmente');
        // Não gerar QR Code manualmente - usar apenas o oficial do Mercado Pago
        setGeneratedQRCode(null);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Código PIX copiado!" });
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset state after a short delay to allow closing animation
        setTimeout(() => {
            setPhone('');
            setCpf('');
            setPixData(null);
            setError(null);
            setIsLoading(false);
            setGeneratedQRCode(null);
            setIsVerifying(false);
            setVerificationAttempts(0);
        }, 300);
    }

    // Verificação automática usando APENAS métodos oficiais
    const startAutomaticVerification = async () => {
        if (!email) return;

        setIsVerifying(true);
        setVerificationAttempts(prev => prev + 1);

        try {
            console.log('🔍 [PIX] Verificação automática oficial:', email);

            // Pegar o paymentId do localStorage se disponível
            const currentPaymentId = localStorage.getItem('currentPixPaymentId');

            const response = await fetch('/api/pix/verify-official', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    name,
                    amount: pixAmountBRL,
                    paymentId: currentPaymentId // Usar paymentId se disponível
                }),
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ [PIX] Pagamento confirmado via email!');

                toast({
                    title: '✅ Pagamento Confirmado!',
                    description: 'Sua assinatura foi ativada automaticamente!',
                });

                // Limpar dados
                localStorage.removeItem('currentPixPaymentId');
                localStorage.removeItem('customerCPF');

                onPaymentSuccess();
                handleClose();
                return;
            }

            // Se não encontrou, tentar novamente em 10 segundos (máximo 6 tentativas = 1 minuto)
            if (verificationAttempts < 6) {
                setTimeout(() => {
                    startAutomaticVerification();
                }, 10000);
            } else {
                console.log('⏰ [PIX] Verificação automática finalizada. Usuário pode verificar manualmente.');
                setIsVerifying(false);
            }

            // Se não encontrou, tentar novamente em 10 segundos (máximo 6 tentativas = 1 minuto)
            if (verificationAttempts < 6) {
                setTimeout(() => {
                    startAutomaticVerification();
                }, 10000);
            } else {
                console.log('⏰ [PIX] Verificação automática finalizada. Usuário pode verificar manualmente.');
                setIsVerifying(false);
            }

        } catch (error) {
            console.error('❌ [PIX] Erro na verificação automática:', error);
            setIsVerifying(false);
        }
    };

    // Verificação manual usando APENAS métodos oficiais
    const handleManualVerification = async () => {
        if (!email) {
            toast({
                variant: 'destructive',
                title: 'Email Obrigatório',
                description: 'Por favor, informe seu email para verificar o pagamento.'
            });
            return;
        }

        setIsVerifying(true);

        try {
            console.log('🔍 [PIX] Verificação manual oficial para email:', email);

            // Pegar o paymentId do localStorage se disponível
            const currentPaymentId = localStorage.getItem('currentPixPaymentId');

            const response = await fetch('/api/pix/verify-official', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    name,
                    amount: pixAmountBRL,
                    paymentId: currentPaymentId // Usar paymentId se disponível
                }),
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ [PIX] Pagamento confirmado via verificação SIMPLES!');

                toast({
                    title: '✅ Pagamento Confirmado!',
                    description: `Sua assinatura foi ativada com sucesso! Valor: R$ ${result.amount}`,
                });

                // Limpar dados
                localStorage.removeItem('currentPixPaymentId');
                localStorage.removeItem('customerCPF');

                onPaymentSuccess();
                handleClose();
            } else {
                // Mostrar informações detalhadas sobre o erro
                let errorMessage = result.message || 'Erro desconhecido';

                if (result.suggestions) {
                    errorMessage += '\n\nSugestões:\n' + result.suggestions.join('\n');
                }

                if (result.allPayments) {
                    errorMessage += '\n\nPagamentos encontrados:\n' +
                        result.allPayments.map((p: any) =>
                            `ID: ${p.id}, Status: ${p.status}, Valor: R$ ${p.amount}`
                        ).join('\n');
                }

                toast({
                    variant: 'destructive',
                    title: result.error || 'Pagamento não encontrado',
                    description: errorMessage
                });
            }

        } catch (error) {
            console.error('❌ [PIX] Erro na verificação manual:', error);
            toast({
                variant: 'destructive',
                title: 'Erro na verificação',
                description: 'Erro ao verificar pagamento. Tente novamente.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Se não está autenticado, mostrar mensagem de erro
    if (authStatus === 'unauthenticated') {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Acesso Negado
                        </DialogTitle>
                        <DialogDescription>
                            Você precisa estar logado para acessar o pagamento
                        </DialogDescription>
                    </DialogHeader>

                    <div className="text-center py-6">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">
                            Para fazer o pagamento, você precisa estar logado em sua conta.
                        </p>
                        <Button
                            onClick={() => {
                                onOpenChange(false);
                                router.push('/auth/face');
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Fazer Login
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Se está verificando autenticação, mostrar loading
    if (authStatus === 'checking') {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <div className="text-center py-6">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Verificando autenticação...</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-green-600" />
                        Pagamento PIX
                    </DialogTitle>
                    <DialogDescription>
                        Escaneie o QR Code ou copie o código PIX para pagar
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Informações do Usuário - APENAS se autenticado */}
                    {authStatus === 'authenticated' && email && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold text-blue-800">Dados do Pagamento</span>
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 text-blue-600" />
                                    <span className="text-blue-700">{email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-blue-600" />
                                    <span className="text-blue-700">{name}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Valor */}
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            R$ {pixAmountBRL.toFixed(2).replace('.', ',')}
                        </div>
                        <div className="text-sm text-gray-600">
                            Assinatura Premium - 30 dias
                        </div>
                        {currency !== 'BRL' && (
                            <div className="text-xs text-blue-600 mt-1">
                                Valor convertido automaticamente para BRL
                            </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                            PIX funciona apenas em Reais brasileiros (BRL)
                        </div>
                    </div>

                    {/* CPF (OBRIGATÓRIO) */}
                    <div className="space-y-2">
                        <Label htmlFor="cpf" className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-red-500" />
                            CPF <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="cpf"
                            type="text"
                            placeholder="000.000.000-00"
                            value={cpf}
                            onChange={handleCpfChange}
                            maxLength={14}
                            className="font-mono"
                        />
                        <p className="text-xs text-gray-500">
                            CPF é obrigatório para verificação do pagamento
                        </p>
                    </div>

                    {/* Telefone (opcional) */}
                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefone (opcional)</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="(11) 99999-9999"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    {/* Botão Gerar PIX */}
                    {!pixData && (
                        <Button
                            onClick={handleGeneratePix}
                            disabled={isLoading || authStatus !== 'authenticated' || !isValidCPF(cpf)}
                            className="w-full"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Gerando PIX...
                                </>
                            ) : (
                                <>
                                    <QrCode className="mr-2 h-4 w-4" />
                                    Gerar PIX
                                </>
                            )}
                        </Button>
                    )}

                    {/* QR Code e Código PIX */}
                    {pixData && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="bg-white p-4 rounded-lg border inline-block">
                                    {generatedQRCode ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={generatedQRCode}
                                            alt="QR Code PIX"
                                            className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] mx-auto"
                                        />
                                    ) : (
                                        <div className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                                            <div className="text-center">
                                                <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-2 animate-spin" />
                                                <p className="text-xs text-gray-500">Gerando QR Code...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Código PIX</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={pixData.qrCode}
                                        readOnly
                                        className="font-mono text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(pixData.qrCode)}
                                    >
                                        <ClipboardCopy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <Alert>
                                <ShieldCheck className="h-4 w-4" />
                                <AlertTitle>Como pagar</AlertTitle>
                                <AlertDesc>
                                    <strong>Para brasileiros:</strong><br />
                                    1. Abra o app do seu banco<br />
                                    2. Escaneie o QR Code ou cole o código PIX<br />
                                    3. Confirme o pagamento<br />
                                    4. O sistema verificará automaticamente<br /><br />

                                    <strong>Para estrangeiros:</strong><br />
                                    • Você precisa de uma conta bancária brasileira<br />
                                    • Ou use um banco digital brasileiro (Nubank, Inter, etc.)<br />
                                    • PIX não funciona com bancos internacionais
                                </AlertDesc>
                            </Alert>

                            <Alert variant="default" className="border-green-200 bg-green-50">
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">Verificação Automática</AlertTitle>
                                <AlertDesc className="text-green-700">
                                    • O sistema verificará automaticamente seu pagamento<br />
                                    • Você será notificado assim que o pagamento for confirmado<br />
                                    • Se não funcionar, clique em &quot;Verificar Manualmente&quot; abaixo
                                </AlertDesc>
                            </Alert>

                            {isVerifying && (
                                <Alert variant="default" className="border-blue-200 bg-blue-50">
                                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                    <AlertTitle className="text-blue-800">Verificando Pagamento...</AlertTitle>
                                    <AlertDesc className="text-blue-700">
                                        Aguarde, estamos verificando seu pagamento automaticamente...
                                    </AlertDesc>
                                </Alert>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleManualVerification}
                                    disabled={isLoading || isVerifying}
                                    className="flex-1"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verificando...
                                        </>
                                    ) : (
                                        'Verificar Manualmente'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Erro */}
                    {error && (
                        <div className="space-y-4">
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Erro no Pagamento</AlertTitle>
                                <AlertDesc>
                                    {error}
                                    <br /><br />
                                    <strong>Soluções possíveis:</strong><br />
                                    • Verifique sua conexão com a internet<br />
                                    • Tente novamente em alguns segundos<br />
                                    • Se o problema persistir, entre em contato com o suporte<br />
                                    • WhatsApp: (11) 99999-9999
                                </AlertDesc>
                            </Alert>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setError(null);
                                        setPixData(null);
                                        setGeneratedQRCode(null);
                                    }}
                                    className="flex-1"
                                >
                                    Tentar Novamente
                                </Button>
                                <Button
                                    onClick={handleClose}
                                    className="flex-1"
                                >
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
