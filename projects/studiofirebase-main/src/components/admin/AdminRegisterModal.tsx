"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from "firebase/auth";
import { ensureAdminDoc, validateUsername } from "@/services/admin-auth-service";
import { useSmsOtp } from "@/hooks/use-sms-otp";
import { auth } from "@/lib/firebase";
import { getBaseUrl } from "@/lib/utils";

interface AdminRegisterModalProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
}

type RegistrationStep = "form" | "verify-phone" | "verify-email" | "done" | "error";

export default function AdminRegisterModal({ open, onOpenChange }: AdminRegisterModalProps) {
    // Estados do formulário
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [phoneOtp, setPhoneOtp] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Estados da UI
    const [step, setStep] = useState<RegistrationStep>("form");
    const [creatingAccount, setCreatingAccount] = useState(false);
    const { toast } = useToast();

    // Hook de SMS
    const {
        sendOtp,
        verifyOtp: verifySmsOtp,
        loading: smsLoading,
        verifying: smsVerifying,
        error: smsError,
        resendCountdown,
        canResend,
        reset: resetSms,
    } = useSmsOtp(
        () => {
            // Success callback
            if (step === "verify-phone") {
                // OTP será verificado manualmente
            }
        },
        (error) => {
            // Error callback
            toast({ variant: "destructive", title: "Erro de SMS", description: error });
        }
    );

    // Reset ao fechar modal
    useEffect(() => {
        if (!open) {
            setName("");
            setUsername("");
            setPhone("");
            setPhoneOtp("");
            setEmail("");
            setPassword("");
            setStep("form");
            resetSms();
        }
    }, [open, resetSms]);

    // Validar username
    const validateUsernameForSubmit = async () => {
        const value = username.trim();
        if (!value) {
            return { valid: false, message: 'Username é obrigatório' };
        }
        try {
            return await validateUsername(value);
        } catch (e: any) {
            return { valid: false, message: e?.message || 'Erro ao validar username' };
        }
    };

    // PASSO 1: Enviar OTP para telefone
    const handleSendPhoneOtp = async () => {
        // Validações
        if (!phone.trim() || !name.trim() || !username.trim()) {
            toast({
                variant: "destructive",
                title: "Campos obrigatórios",
                description: "Preencha nome, username e telefone.",
            });
            return;
        }

        const usernameValidation = await validateUsernameForSubmit();
        if (!usernameValidation.valid) {
            toast({
                variant: "destructive",
                title: "Username inválido",
                description: usernameValidation.message,
            });
            return;
        }

        try {
            console.log('[AdminRegisterModal] Enviando OTP para:', phone);
            await sendOtp(phone, 'recaptcha-container-admin');
            setStep("verify-phone");
            toast({
                title: "OTP enviado! ✅",
                description: "Verifique seu SMS com o código de 6 dígitos.",
            });
        } catch (error: any) {
            console.error('[AdminRegisterModal] Erro ao enviar OTP:', error);
            toast({
                variant: "destructive",
                title: "Erro ao enviar OTP",
                description: error.message || 'Falha ao enviar código por SMS',
            });
        }
    };

    // PASSO 2: Verificar código OTP de telefone
    const handleVerifyPhone = async () => {
        if (!phoneOtp.trim()) {
            toast({
                variant: "destructive",
                title: "Código obrigatório",
                description: "Digite o código OTP recebido.",
            });
            return;
        }

        try {
            console.log('[AdminRegisterModal] Verificando OTP...');
            const success = await verifySmsOtp(phoneOtp);

            if (!success) {
                toast({
                    variant: "destructive",
                    title: "Código inválido",
                    description: "Verifique o código e tente novamente.",
                });
                return;
            }

            setPhoneOtp("");
            setStep("verify-email");
            toast({
                title: "Telefone verificado! ✅",
                description: "Agora preencha seu e-mail e senha.",
            });
        } catch (error: any) {
            console.error('[AdminRegisterModal] Erro ao verificar OTP:', error);
            toast({
                variant: "destructive",
                title: "Erro ao verificar código",
                description: error.message,
            });
        }
    };

    // PASSO 3: Criar conta com email/senha e enviar verificação
    const handleCreateEmailAccount = async () => {
        // Validações
        if (!email.trim() || !password.trim()) {
            toast({
                variant: "destructive",
                title: "Campos obrigatórios",
                description: "Preencha e-mail e senha.",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                variant: "destructive",
                title: "Senha fraca",
                description: "Use no mínimo 6 caracteres.",
            });
            return;
        }

        setCreatingAccount(true);

        try {
            console.log('[AdminRegisterModal] Criando conta...');

            // 1. Criar usuário com email/senha
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            const user = userCredential.user;

            console.log('[AdminRegisterModal] Usuário criado:', user.uid);

            // 2. Atualizar perfil
            await updateProfile(user, {
                displayName: name,
            });

            // 3. Enviar email de verificação
            console.log('[AdminRegisterModal] Enviando email de verificação...');
            const normalizedUsername = username.toLowerCase().trim();
            const actionUrl = `${getBaseUrl()}/auth/action?context=admin&redirect=/${normalizedUsername}/admin`;
            await sendEmailVerification(user, {
                url: actionUrl,
                handleCodeInApp: true,
            });

            // 4. Criar documento admin
            await ensureAdminDoc(user, name, phone, username);

            // 5. Chamar bootstrap para configurar claims customizadas (role: admin, etc)
            const idToken = await user.getIdToken(true);
            const bootstrapRes = await fetch('/api/admin/bootstrap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken,
                    name,
                    phone: user.phoneNumber ?? undefined,
                    username,
                }),
            });

            if (!bootstrapRes.ok) {
                const errorData = await bootstrapRes.json().catch(() => ({}));
                console.error('[AdminRegisterModal] Erro no bootstrap:', errorData);
                // Não bloqueamos aqui se o doc já foi criado, mas logamos o erro
            }

            // 6. Fazer logout automático (forçar verificação de email antes de login)
            await signOut(auth);

            console.log('[AdminRegisterModal] Cadastro concluído com sucesso');

            setStep("done");
            toast({
                title: "Cadastro concluído! 🎉",
                description: "Verifique seu e-mail e faça login.",
            });

            // Fechar modal após 3 segundos
            setTimeout(() => {
                onOpenChange(false);
                setName("");
                setUsername("");
                setPhone("");
                setPhoneOtp("");
                setEmail("");
                setPassword("");
                setStep("form");
                resetSms();
            }, 3000);
        } catch (error: any) {
            console.error('[AdminRegisterModal] Erro ao criar conta:', error);

            let message = error.message;
            if (error.code === 'auth/email-already-in-use') {
                message = 'Este e-mail já está registrado.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'E-mail inválido.';
            } else if (error.code === 'auth/weak-password') {
                message = 'Senha muito fraca. Use pelo menos 6 caracteres.';
            }

            toast({
                variant: "destructive",
                title: "Erro ao criar conta",
                description: message,
            });
        } finally {
            setCreatingAccount(false);
        }
    };

    // Reenviar OTP
    const handleResendOtp = async () => {
        if (!phone) return;
        try {
            await sendOtp(phone, 'recaptcha-container-admin');
            toast({
                title: "OTP re-enviado! ✅",
                description: "Verifique seu SMS novamente.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao reenviar OTP",
                description: error.message,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm p-0">
                <Card className="w-full border-0 shadow-none">
                    <CardContent className="pt-6">
                        <div className="flex justify-center mb-4">
                            <ShieldCheck className="h-10 w-10 text-primary" />
                        </div>
                        <DialogHeader className="text-center space-y-2 mb-6">
                            <DialogTitle className="text-2xl">Cadastro de Administrador</DialogTitle>
                            <DialogDescription>
                                {step === "form" && "Preencha os campos abaixo para criar sua conta"}
                                {step === "verify-phone" && "Verifique seu telefone com o código SMS"}
                                {step === "verify-email" && "Finalize o cadastro com seu e-mail"}
                                {step === "done" && "Cadastro concluído com sucesso!"}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* PASSO 1: FORMULÁRIO INICIAL */}
                            {step === "form" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="admin-name">Nome Completo *</Label>
                                        <Input
                                            id="admin-name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Ex: João Silva"
                                            disabled={smsLoading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admin-username">Username *</Label>
                                        <Input
                                            id="admin-username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Ex: joaosilva ou admin-1"
                                            disabled={smsLoading}
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admin-phone">Telefone (com DDD) *</Label>
                                        <Input
                                            id="admin-phone"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+14155552671 ou 11999999999"
                                            disabled={smsLoading}
                                            type="tel"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Formato: E.164 (ex: +14155552671) ou BR com DDD (ex: 11999999999)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admin-email">E-mail *</Label>
                                        <Input
                                            id="admin-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@exemplo.com"
                                            disabled={smsLoading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admin-password">Senha (mín. 6 caracteres) *</Label>
                                        <Input
                                            id="admin-password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            disabled={smsLoading}
                                        />
                                    </div>

                                    <div id="recaptcha-container-admin" className="flex justify-center py-2" />

                                    {smsError && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{smsError}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex flex-col gap-2 pt-2">
                                        <Button
                                            className="w-full"
                                            onClick={handleSendPhoneOtp}
                                            disabled={smsLoading || !name || !username || !phone || !email || !password}
                                        >
                                            {smsLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Enviando...
                                                </>
                                            ) : (
                                                "Continuar (Enviar OTP)"
                                            )}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => onOpenChange(false)}
                                            disabled={smsLoading}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* PASSO 2: VERIFICAR TELEFONE */}
                            {step === "verify-phone" && (
                                <>
                                    <div className="text-center space-y-2">
                                        <p className="text-sm font-medium">
                                            Código enviado para {phone.replace(/\d(?=\d{4})/g, "*")}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Digite o código de 6 dígitos recebido por SMS
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone-otp">Código OTP *</Label>
                                        <Input
                                            id="phone-otp"
                                            value={phoneOtp}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                setPhoneOtp(value);
                                            }}
                                            placeholder="000000"
                                            maxLength={6}
                                            disabled={smsVerifying}
                                            type="text"
                                            inputMode="numeric"
                                            className="text-center text-lg tracking-widest"
                                        />
                                    </div>

                                    {smsError && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{smsError}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex flex-col gap-2 pt-2">
                                        <Button
                                            className="w-full"
                                            onClick={handleVerifyPhone}
                                            disabled={smsVerifying || !phoneOtp || phoneOtp.length !== 6}
                                        >
                                            {smsVerifying ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Verificando...
                                                </>
                                            ) : (
                                                "Verificar Código"
                                            )}
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            onClick={handleResendOtp}
                                            disabled={!canResend() || smsLoading}
                                            className="text-xs"
                                        >
                                            {resendCountdown > 0
                                                ? `Reenviar em ${resendCountdown}s`
                                                : "Reenviar código"}
                                        </Button>

                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                setStep("form");
                                                setPhoneOtp("");
                                                resetSms();
                                            }}
                                            disabled={smsVerifying}
                                        >
                                            Voltar
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* PASSO 3: VERIFICAR EMAIL */}
                            {step === "verify-email" && (
                                <>
                                    <div className="text-center space-y-3">
                                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                                        <div>
                                            <p className="font-medium">Telefone Verificado! ✅</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Agora vamos criar sua conta com e-mail e senha
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border-t border-b py-3 space-y-1 text-sm">
                                        <p className="text-muted-foreground">
                                            <span className="font-medium">Nome:</span> {name}
                                        </p>
                                        <p className="text-muted-foreground">
                                            <span className="font-medium">Username:</span> {username}
                                        </p>
                                        <p className="text-muted-foreground">
                                            <span className="font-medium">Telefone:</span> {phone}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            className="w-full"
                                            onClick={handleCreateEmailAccount}
                                            disabled={creatingAccount}
                                        >
                                            {creatingAccount ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Criando conta...
                                                </>
                                            ) : (
                                                "Criar Conta"
                                            )}
                                        </Button>

                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                setStep("form");
                                                setPhoneOtp("");
                                                resetSms();
                                            }}
                                            disabled={creatingAccount}
                                        >
                                            Voltar
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* PASSO 4: SUCESSO */}
                            {step === "done" && (
                                <div className="text-center space-y-4 py-4">
                                    <div className="flex justify-center">
                                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold">Cadastro Concluído!</p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            📧 Verifique seu e-mail e clique no link de confirmação
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-xs text-left space-y-1">
                                        <p className="font-medium text-blue-900 dark:text-blue-100">Próximos passos:</p>
                                        <ol className="list-decimal list-inside text-blue-800 dark:text-blue-200 space-y-1">
                                            <li>Procure o email em sua caixa de entrada ou SPAM</li>
                                            <li>Clique no link de confirmação</li>
                                            <li>Volte para fazer login</li>
                                        </ol>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}
