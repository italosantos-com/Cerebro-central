"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, CheckCircle, Mail, Phone, ArrowLeft, User } from "lucide-react";
import { sendAdminPasswordResetEmail } from '@/services/admin-auth-service';
import { validateIdentifierFormat } from '@/services/admin-flexible-auth';
import { sendVerificationCode, verifyCode } from '@/services/verification-service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AdminForgotPasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type RecoveryMethod = 'email' | 'sms' | null;
type Step = 'input' | 'choose-method' | 'verify-code' | 'success';

interface AdminInfo {
    uid: string;
    name: string;
    email: string;
    phone: string;
    username: string;
    maskedEmail: string;
    maskedPhone: string;
}

export default function AdminForgotPasswordModal({ open, onOpenChange }: AdminForgotPasswordModalProps) {
    const [identifier, setIdentifier] = useState("");
    const [step, setStep] = useState<Step>('input');
    const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
    const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Resetar estado quando modal fechar
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setIdentifier("");
                setStep('input');
                setAdminInfo(null);
                setRecoveryMethod(null);
                setVerificationCode("");
            }, 300);
        }
    }, [open]);

    // Mascarar email: admin@example.com -> a***n@e***e.com
    const maskEmail = (email: string): string => {
        if (!email) return "";
        const [local, domain] = email.split("@");
        if (!domain) return email;
        const [domainName, ext] = domain.split(".");
        const maskedLocal = local.length > 2 
            ? `${local[0]}***${local[local.length - 1]}` 
            : `${local[0]}***`;
        const maskedDomain = domainName.length > 2 
            ? `${domainName[0]}***${domainName[domainName.length - 1]}` 
            : `${domainName[0]}***`;
        return `${maskedLocal}@${maskedDomain}.${ext}`;
    };

    // Mascarar telefone: +5521980246195 -> +55***46195
    const maskPhone = (phone: string): string => {
        if (!phone) return "";
        const cleaned = phone.replace(/\D/g, "");
        if (cleaned.length < 8) return "***" + cleaned.slice(-4);
        return `+${cleaned.slice(0, 2)}***${cleaned.slice(-5)}`;
    };

    // Buscar admin por identificador
    const handleSearchAdmin = async () => {
        if (!identifier.trim()) {
            toast({ variant: "destructive", title: "Campo obrigatório", description: "Informe seu email, @username ou telefone." });
            return;
        }

        setIsLoading(true);

        try {
            const validation = validateIdentifierFormat(identifier);
            
            // Se for email direto, enviar recuperação por email
            if (validation.type === 'email') {
                await sendAdminPasswordResetEmail(identifier);
                setAdminInfo({
                    uid: "",
                    name: "",
                    email: identifier,
                    phone: "",
                    username: "",
                    maskedEmail: maskEmail(identifier),
                    maskedPhone: ""
                });
                setRecoveryMethod('email');
                setStep('success');
                toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." });
                return;
            }

            // Buscar admin no Firestore
            let adminData: any = null;
            
            if (validation.type === 'username') {
                const username = identifier.replace(/^@/, "").toLowerCase();
                const adminsRef = collection(db, "admins");
                const q = query(adminsRef, where("username", "==", username));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    adminData = { uid: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                }
            } else if (validation.type === 'phone') {
                // Buscar por telefone
                const phoneClean = identifier.replace(/\D/g, "");
                const adminsRef = collection(db, "admins");
                const allAdmins = await getDocs(adminsRef);
                
                for (const doc of allAdmins.docs) {
                    const data = doc.data();
                    if (!data.phone) continue;
                    const adminPhoneClean = String(data.phone).replace(/\D/g, "");
                    if (phoneClean === adminPhoneClean || 
                        phoneClean.endsWith(adminPhoneClean) || 
                        adminPhoneClean.endsWith(phoneClean)) {
                        adminData = { uid: doc.id, ...data };
                        break;
                    }
                }
            }

            if (!adminData) {
                toast({ variant: "destructive", title: "Admin não encontrado", description: "Nenhum administrador encontrado com este identificador." });
                return;
            }

            // Verificar se tem email e/ou telefone
            const hasEmail = !!adminData.email;
            const hasPhone = !!adminData.phone;

            if (!hasEmail && !hasPhone) {
                toast({ variant: "destructive", title: "Sem contato", description: "Este admin não possui email ou telefone cadastrado." });
                return;
            }

            const info: AdminInfo = {
                uid: adminData.uid,
                name: adminData.name || "Admin",
                email: adminData.email || "",
                phone: adminData.phone || "",
                username: adminData.username || "",
                maskedEmail: maskEmail(adminData.email || ""),
                maskedPhone: maskPhone(adminData.phone || "")
            };

            setAdminInfo(info);

            // Se tem apenas um método, usar diretamente
            if (hasEmail && !hasPhone) {
                await sendAdminPasswordResetEmail(info.email);
                setRecoveryMethod('email');
                setStep('success');
                toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." });
            } else if (!hasEmail && hasPhone) {
                await sendSmsRecovery(info.phone);
            } else {
                // Tem ambos - deixar usuário escolher
                setStep('choose-method');
            }

        } catch (error: any) {
            console.error('[Forgot Password] Erro:', error);
            let errorMessage = error.message || "Erro ao buscar administrador.";
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = "Nenhuma conta encontrada com este email.";
            }
            
            toast({ variant: "destructive", title: "Erro", description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    // Enviar SMS de recuperação
    const sendSmsRecovery = async (phone: string) => {
        setIsLoading(true);
        try {
            const result = await sendVerificationCode('sms', phone);
            if (result.success) {
                setRecoveryMethod('sms');
                setStep('verify-code');
                toast({ title: "SMS enviado!", description: "Digite o código recebido." });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro ao enviar SMS", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // Escolher método de recuperação
    const handleChooseMethod = async (method: RecoveryMethod) => {
        if (!adminInfo) return;
        
        setIsLoading(true);
        try {
            if (method === 'email') {
                await sendAdminPasswordResetEmail(adminInfo.email);
                setRecoveryMethod('email');
                setStep('success');
                toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." });
            } else if (method === 'sms') {
                await sendSmsRecovery(adminInfo.phone);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // Verificar código SMS
    const handleVerifyCode = async () => {
        if (!adminInfo || !verificationCode.trim()) {
            toast({ variant: "destructive", title: "Código obrigatório", description: "Digite o código recebido por SMS." });
            return;
        }

        setIsLoading(true);
        try {
            const result = await verifyCode(adminInfo.phone, verificationCode);
            
            if (result.success) {
                // Código verificado - enviar email de reset como fallback
                // Em produção, poderia redirecionar para página de redefinir senha
                await sendAdminPasswordResetEmail(adminInfo.email);
                setStep('success');
                toast({ title: "Verificado!", description: "Email de recuperação enviado para sua conta." });
            } else {
                throw new Error(result.message || "Código inválido");
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Código inválido", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // Voltar ao passo anterior
    const handleBack = () => {
        if (step === 'choose-method' || step === 'verify-code') {
            setStep('input');
            setAdminInfo(null);
            setRecoveryMethod(null);
            setVerificationCode("");
        }
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-sm p-0">
                <Card className="w-full border-0 shadow-none">
                    <CardContent className="pt-6">
                        {/* Ícone */}
                        <div className="flex justify-center mb-4">
                            {step === 'success' ? (
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            ) : step === 'choose-method' ? (
                                <User className="h-10 w-10 text-primary" />
                            ) : (
                                <ShieldCheck className="h-10 w-10 text-primary" />
                            )}
                        </div>

                        {/* reCAPTCHA container (Firebase Phone Auth) */}
                        <div id="recaptcha-container" />

                        <DialogHeader className="text-center space-y-2 mb-6">
                            <DialogTitle className="text-2xl">
                                {step === 'success' ? 'Recuperação Enviada' : 
                                 step === 'choose-method' ? 'Escolha o Método' :
                                 step === 'verify-code' ? 'Verificar Código' :
                                 'Recuperar Senha'}
                            </DialogTitle>
                            <DialogDescription>
                                {step === 'success' && recoveryMethod === 'email' && 
                                    "Email de recuperação enviado com sucesso!"}
                                {step === 'success' && recoveryMethod === 'sms' && 
                                    "Verificação concluída! Email de recuperação enviado."}
                                {step === 'choose-method' && adminInfo &&
                                    `Olá ${adminInfo.name}! Como deseja recuperar sua senha?`}
                                {step === 'verify-code' && 
                                    `Digite o código enviado para ${adminInfo?.maskedPhone}`}
                                {step === 'input' && 
                                    "Informe seu email, @username ou telefone."}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Step: Input */}
                            {step === 'input' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="forgot-identifier">Email, @Username ou Telefone</Label>
                                        <Input
                                            id="forgot-identifier"
                                            type="text"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            placeholder="@severepics, email@exemplo.com ou telefone"
                                            disabled={isLoading}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSearchAdmin()}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Ao informar @username, você poderá escolher entre email ou SMS.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            className="w-full"
                                            onClick={handleSearchAdmin}
                                            disabled={isLoading || !identifier.trim()}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Buscando...
                                                </>
                                            ) : (
                                                "Continuar"
                                            )}
                                        </Button>
                                        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
                                            Cancelar
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Step: Choose Method */}
                            {step === 'choose-method' && adminInfo && (
                                <>
                                    <div className="space-y-3">
                                        {/* Opção Email */}
                                        {adminInfo.email && (
                                            <Button
                                                variant="outline"
                                                className="w-full h-auto py-4 flex items-start gap-3 justify-start"
                                                onClick={() => handleChooseMethod('email')}
                                                disabled={isLoading}
                                            >
                                                <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
                                                <div className="text-left">
                                                    <div className="font-medium">Recuperar via Email</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Enviar link para {adminInfo.maskedEmail}
                                                    </div>
                                                </div>
                                            </Button>
                                        )}

                                        {/* Opção SMS */}
                                        {adminInfo.phone && (
                                            <Button
                                                variant="outline"
                                                className="w-full h-auto py-4 flex items-start gap-3 justify-start"
                                                onClick={() => handleChooseMethod('sms')}
                                                disabled={isLoading}
                                            >
                                                <Phone className="h-5 w-5 text-green-500 mt-0.5" />
                                                <div className="text-left">
                                                    <div className="font-medium">Recuperar via SMS</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Enviar código para {adminInfo.maskedPhone}
                                                    </div>
                                                </div>
                                            </Button>
                                        )}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        onClick={handleBack}
                                        disabled={isLoading}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Voltar
                                    </Button>
                                </>
                            )}

                            {/* Step: Verify Code */}
                            {step === 'verify-code' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="verification-code">Código de Verificação</Label>
                                        <Input
                                            id="verification-code"
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                            placeholder="000000"
                                            maxLength={6}
                                            className="text-center text-2xl tracking-widest"
                                            disabled={isLoading}
                                            onKeyPress={(e) => e.key === 'Enter' && handleVerifyCode()}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            className="w-full"
                                            onClick={handleVerifyCode}
                                            disabled={isLoading || verificationCode.length < 6}
                                        >
                                            {isLoading ? (
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
                                            onClick={() => adminInfo && sendSmsRecovery(adminInfo.phone)}
                                            disabled={isLoading}
                                            className="text-sm"
                                        >
                                            Reenviar código
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            onClick={handleBack}
                                            disabled={isLoading}
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Voltar
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Step: Success */}
                            {step === 'success' && (
                                <div className="space-y-4">
                                    <div className="text-center space-y-2">
                                        {recoveryMethod === 'email' && (
                                            <>
                                                <p className="text-sm text-muted-foreground">
                                                    Um email foi enviado para <strong>{adminInfo?.maskedEmail || identifier}</strong>
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Clique no link do email para redefinir sua senha.
                                                </p>
                                            </>
                                        )}
                                        {recoveryMethod === 'sms' && (
                                            <>
                                                <p className="text-sm text-muted-foreground">
                                                    Verificação por SMS concluída!
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Um email de recuperação foi enviado para <strong>{adminInfo?.maskedEmail}</strong>
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button className="w-full" onClick={handleClose}>
                                            Entendi
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setStep('input');
                                                setIdentifier("");
                                                setAdminInfo(null);
                                                setRecoveryMethod(null);
                                            }}
                                        >
                                            Tentar outro identificador
                                        </Button>
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
