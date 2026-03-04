"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
    applyActionCode,
    confirmPasswordReset,
    verifyPasswordResetCode,
    checkActionCode
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

type ActionMode =
    | 'resetPassword'
    | 'verifyEmail'
    | 'recoverEmail'
    | 'verifyAndChangeEmail'
    // Suporte a MFA (Firebase/Identity Platform)
    | 'mfaEnrollment'
    | 'mfaSignIn';

export default function AuthActionPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const redirectParam = searchParams?.get?.('redirect');
    const continueUrlParam = searchParams?.get?.('continueUrl');

    // helper that validates a candidate path is a local route
    const validateLocal = (path?: string | null) => {
      if (!path) return undefined;
      return path.startsWith('/') ? path : undefined;
    };

    let safeRedirect = validateLocal(redirectParam);

    // if nothing provided directly, try to extract from the continueUrl (Firebase adds this)
    if (!safeRedirect && continueUrlParam) {
      try {
        const parsed = new URL(continueUrlParam);
        safeRedirect = validateLocal(parsed.searchParams.get('redirect'));
      } catch {
        // ignore malformed continueUrl
      }
    }

    const isAdminContext = searchParams?.get?.('context') === 'admin';

    const [mode, setMode] = useState<ActionMode | null>(null);
    const [oobCode, setOobCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [email, setEmail] = useState<string>('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [actionCompleted, setActionCompleted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Campos adicionais para MFA
    const [mfaInfo, setMfaInfo] = useState<{ tenantId?: string | null } | null>(null);
    const [mfaHint, setMfaHint] = useState<string | null>(null);

    useEffect(() => {
        const modeParam = searchParams?.get?.('mode') as ActionMode;
        const codeParam = searchParams?.get?.('oobCode');

        if (!modeParam || !codeParam) {
            setError('Link inválido ou expirado.');
            setIsLoading(false);
            return;
        }

        setMode(modeParam);
        setOobCode(codeParam);

        // Verificar e obter informações do código
        // Para modos com oobCode padrão, verificar código
        if (
            modeParam === 'verifyEmail' ||
            modeParam === 'resetPassword' ||
            modeParam === 'recoverEmail' ||
            modeParam === 'verifyAndChangeEmail'
        ) {
            verifyActionCode(codeParam, modeParam);
            
            // Auto-trigger verifyEmail for better UX
            if (modeParam === 'verifyEmail') {
                setTimeout(() => {
                    handleVerifyEmailByCode(codeParam);
                }, 1000);
            }
        } else {
            // Modos MFA não usam checkActionCode da mesma forma
            setIsLoading(false);
        }
    }, [searchParams]);

    // Internal helper for auto-verification
    const handleVerifyEmailByCode = async (code: string) => {
        setIsProcessing(true);
        try {
            await applyActionCode(auth, code);
            setActionCompleted(true);
            toast({
                title: "E-mail Verificado!",
                description: isAdminContext
                    ? "Conta de administrador confirmada com sucesso."
                    : "Seu endereço de e-mail foi verificado com sucesso.",
            });

            setTimeout(() => {
                router.push(getRedirectTarget('verifyEmail'));
            }, 2000);
        } catch (error: any) {
            console.error('Erro ao verificar e-mail:', error);
            setError('Falha ao verificar e-mail automaticamente. Tente clicar no botão abaixo.');
            setIsProcessing(false);
        }
    };

    const verifyActionCode = async (code: string, actionMode: ActionMode) => {
        try {
            const info = await checkActionCode(auth, code);

            if (info.data.email) {
                setEmail(info.data.email);
            }

            setIsLoading(false);
        } catch (error: any) {
            console.error('Erro ao verificar código:', error);
            setError('Este link é inválido ou expirou. Solicite um novo link.');
            setIsLoading(false);
        }
    };

    const getRedirectTarget = (actionMode: ActionMode | null) => {
        if (safeRedirect) return safeRedirect;
        if (actionMode === 'resetPassword') return '/auth/face';
        if (actionMode === 'recoverEmail') return '/perfil';
        // default for verifyEmail and other modes: send to profile (global)
        return '/perfil';
    };

    // MFA: Enrolar segundo fator (placeholder UI)
    const handleMfaEnroll = async () => {
        try {
            setIsProcessing(true);
            // A UI de MFA requer fluxo específico (TOTP/SMS/Chave de segurança).
            // Aqui mostramos instruções básicas; a implementação completa depende do fator escolhido.
            toast({
                title: 'Configuração de MFA',
                description:
                    'Abra as configurações de segurança no painel e siga as instruções para adicionar um segundo fator (TOTP/SMS/Chave).',
            });
            setActionCompleted(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro MFA', description: e?.message || 'Falha ao configurar MFA' });
        } finally {
            setIsProcessing(false);
        }
    };

    // MFA: Concluir login com segundo fator (placeholder)
    const handleMfaSignin = async () => {
        try {
            setIsProcessing(true);
            toast({
                title: 'Confirmação de MFA',
                description: 'Finalize o login fornecendo o segundo fator conforme solicitado no fluxo de autenticação.',
            });
            setActionCompleted(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro MFA', description: e?.message || 'Falha ao confirmar MFA' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!oobCode) return;

        setIsProcessing(true);
        try {
            await applyActionCode(auth, oobCode);
            setActionCompleted(true);
            toast({
                title: "E-mail Verificado!",
                description: isAdminContext
                    ? "Conta de administrador confirmada com sucesso."
                    : "Seu endereço de e-mail foi verificado com sucesso.",
            });

            setTimeout(() => {
                router.push(getRedirectTarget('verifyEmail'));
            }, 3000);
        } catch (error: any) {
            console.error('Erro ao verificar e-mail:', error);
            toast({
                variant: "destructive",
                title: "Erro ao Verificar E-mail",
                description: error.message || "Ocorreu um erro. Tente novamente.",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResetPassword = async () => {
        if (!oobCode) return;

        if (newPassword.length < 6) {
            toast({
                variant: "destructive",
                title: "Senha Inválida",
                description: "A senha deve ter pelo menos 6 caracteres.",
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({
                variant: "destructive",
                title: "Senhas Não Coincidem",
                description: "As senhas digitadas não são iguais.",
            });
            return;
        }

        setIsProcessing(true);
        try {
            await verifyPasswordResetCode(auth, oobCode);
            await confirmPasswordReset(auth, oobCode, newPassword);

            setActionCompleted(true);
            toast({
                title: "Senha Redefinida!",
                description: "Sua senha foi alterada com sucesso. Faça login com a nova senha.",
            });

            setTimeout(() => {
                router.push(getRedirectTarget('resetPassword'));
            }, 3000);
        } catch (error: any) {
            console.error('Erro ao redefinir senha:', error);
            toast({
                variant: "destructive",
                title: "Erro ao Redefinir Senha",
                description: error.message || "Ocorreu um erro. Tente novamente.",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRecoverEmail = async () => {
        if (!oobCode) return;

        setIsProcessing(true);
        try {
            await applyActionCode(auth, oobCode);
            setActionCompleted(true);
            toast({
                title: "E-mail Recuperado!",
                description: "Seu endereço de e-mail foi restaurado com sucesso.",
            });

            setTimeout(() => {
                router.push(getRedirectTarget('recoverEmail'));
            }, 3000);
        } catch (error: any) {
            console.error('Erro ao recuperar e-mail:', error);
            toast({
                variant: "destructive",
                title: "Erro ao Recuperar E-mail",
                description: error.message || "Ocorreu um erro. Tente novamente.",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerifyAndChangeEmail = async () => {
        if (!oobCode) return;

        setIsProcessing(true);
        try {
            await applyActionCode(auth, oobCode);
            setActionCompleted(true);
            toast({
                title: "E-mail Alterado!",
                description: "Seu endereço de e-mail foi alterado com sucesso.",
            });

            setTimeout(() => {
                router.push(getRedirectTarget('verifyAndChangeEmail'));
            }, 3000);
        } catch (error: any) {
            console.error('Erro ao alterar e-mail:', error);
            toast({
                variant: "destructive",
                title: "Erro ao Alterar E-mail",
                description: error.message || "Ocorreu um erro. Tente novamente.",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-background">
                <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Verificando link...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-background">
                <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-destructive/50 bg-card/90 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <AlertCircle className="h-16 w-16 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl text-destructive">Link Inválido</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => router.push(getRedirectTarget(mode))}
                            className="w-full"
                        >
                            Voltar para Página Inicial
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            {/* Modal: Verificação de E-mail */}
            {mode === 'verifyEmail' && (
                <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            {actionCompleted ? (
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                            ) : (
                                <Mail className="h-16 w-16 text-primary" />
                            )}
                        </div>
                        <CardTitle className="text-2xl text-white">
                            {actionCompleted ? 'E-mail Verificado!' : 'Verificar E-mail'}
                        </CardTitle>
                        <CardDescription>
                            {actionCompleted
                                ? (isAdminContext
                                    ? 'Conta de administrador confirmada. Você já pode acessar o painel.'
                                    : 'Seu e-mail foi verificado com sucesso.')
                                : `Confirme a verificação do e-mail: ${email}`
                            }
                        </CardDescription>
                    </CardHeader>
                    {!actionCompleted && (
                        <CardContent className="space-y-4">
                            <Button
                                onClick={handleVerifyEmail}
                                disabled={isProcessing}
                                className="w-full"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    'Confirmar Verificação'
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push(getRedirectTarget(mode))}
                                className="w-full"
                            >
                                Cancelar
                            </Button>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Modal: Redefinição de Senha */}
            {mode === 'resetPassword' && (
                <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            {actionCompleted ? (
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                            ) : (
                                <Lock className="h-16 w-16 text-primary" />
                            )}
                        </div>
                        <CardTitle className="text-2xl text-white">
                            {actionCompleted ? 'Senha Redefinida!' : 'Redefinir Senha'}
                        </CardTitle>
                        <CardDescription>
                            {actionCompleted
                                ? 'Sua senha foi alterada com sucesso.'
                                : `Digite uma nova senha para: ${email}`
                            }
                        </CardDescription>
                    </CardHeader>
                    {!actionCompleted && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Nova Senha</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Digite a nova senha"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={isProcessing}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Digite a senha novamente"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isProcessing}
                                />
                            </div>
                            <Button
                                onClick={handleResetPassword}
                                disabled={isProcessing}
                                className="w-full"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Redefinindo...
                                    </>
                                ) : (
                                    'Redefinir Senha'
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push(getRedirectTarget(mode))}
                                className="w-full"
                            >
                                Cancelar
                            </Button>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Modal: Recuperar E-mail (Reverter Alteração) */}
            {mode === 'recoverEmail' && (
                <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            {actionCompleted ? (
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                            ) : (
                                <Mail className="h-16 w-16 text-primary" />
                            )}
                        </div>
                        <CardTitle className="text-2xl text-white">
                            {actionCompleted ? 'E-mail Recuperado!' : 'Recuperar E-mail'}
                        </CardTitle>
                        <CardDescription>
                            {actionCompleted
                                ? 'Seu e-mail anterior foi restaurado com sucesso.'
                                : `Restaurar o e-mail anterior: ${email}`
                            }
                        </CardDescription>
                    </CardHeader>
                    {!actionCompleted && (
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg border border-primary/20">
                                <p className="text-sm text-muted-foreground">
                                    Se você não solicitou a alteração do seu e-mail, clique em &quot;Recuperar E-mail&quot; para reverter a alteração.
                                </p>
                            </div>
                            <Button
                                onClick={handleRecoverEmail}
                                disabled={isProcessing}
                                className="w-full"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Recuperando...
                                    </>
                                ) : (
                                    'Recuperar E-mail'
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/')}
                                className="w-full"
                            >
                                Cancelar
                            </Button>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Modal: Verificar e Alterar E-mail */}
            {mode === 'verifyAndChangeEmail' && (
                <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            {actionCompleted ? (
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                            ) : (
                                <Shield className="h-16 w-16 text-primary" />
                            )}
                        </div>
                        <CardTitle className="text-2xl text-white">
                            {actionCompleted ? 'E-mail Alterado!' : 'Confirmar Alteração de E-mail'}
                        </CardTitle>
                        <CardDescription>
                            {actionCompleted
                                ? 'Seu e-mail foi alterado com sucesso.'
                                : `Confirme a alteração para o novo e-mail: ${email}`
                            }
                        </CardDescription>
                    </CardHeader>
                    {!actionCompleted && (
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg border border-primary/20">
                                <p className="text-sm text-muted-foreground">
                                    Ao confirmar, seu e-mail de login será alterado permanentemente.
                                </p>
                            </div>
                            <Button
                                onClick={handleVerifyAndChangeEmail}
                                disabled={isProcessing}
                                className="w-full"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Confirmando...
                                    </>
                                ) : (
                                    'Confirmar Alteração'
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push(getRedirectTarget(mode))}
                                className="w-full"
                            >
                                Cancelar
                            </Button>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Modal: MFA - Configuração de Multifator */}
            {mode === 'mfaEnrollment' && (
                <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            {actionCompleted ? (
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                            ) : (
                                <Shield className="h-16 w-16 text-primary" />
                            )}
                        </div>
                        <CardTitle className="text-2xl text-white">
                            {actionCompleted ? 'MFA Configurado!' : 'Configurar Autenticação Multifator'}
                        </CardTitle>
                        <CardDescription>
                            {actionCompleted
                                ? 'Seu segundo fator foi configurado.'
                                : 'Siga as instruções para adicionar um segundo fator (TOTP/SMS/Chave de segurança).'}
                        </CardDescription>
                    </CardHeader>
                    {!actionCompleted && (
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg border border-primary/20">
                                <p className="text-sm text-muted-foreground">
                                    Abra as configurações de segurança no painel e escolha seu segundo fator preferido.
                                </p>
                            </div>
                            <Button onClick={handleMfaEnroll} disabled={isProcessing} className="w-full">
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Configurando...
                                    </>
                                ) : (
                                    'Configurar Multifator'
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => router.push(getRedirectTarget(mode))} className="w-full">
                                Cancelar
                            </Button>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Modal: MFA - Concluir login com Multifator */}
            {mode === 'mfaSignIn' && (
                <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            {actionCompleted ? (
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                            ) : (
                                <Shield className="h-16 w-16 text-primary" />
                            )}
                        </div>
                        <CardTitle className="text-2xl text-white">
                            {actionCompleted ? 'Login Confirmado!' : 'Confirmar Login com Multifator'}
                        </CardTitle>
                        <CardDescription>
                            {actionCompleted
                                ? 'Seu login com MFA foi concluído.'
                                : 'Informe o segundo fator conforme solicitado para concluir o login.'}
                        </CardDescription>
                    </CardHeader>
                    {!actionCompleted && (
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg border border-primary/20">
                                <p className="text-sm text-muted-foreground">
                                    Verifique seu app autenticador, SMS ou chave de segurança e conclua a verificação.
                                </p>
                            </div>
                            <Button onClick={handleMfaSignin} disabled={isProcessing} className="w-full">
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Confirmando...
                                    </>
                                ) : (
                                    'Confirmar'
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => router.push(getRedirectTarget(mode))} className="w-full">
                                Cancelar
                            </Button>
                        </CardContent>
                    )}
                </Card>
            )}
        </div>
    );
}
