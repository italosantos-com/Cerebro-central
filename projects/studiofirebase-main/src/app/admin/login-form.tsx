"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, ShieldCheck, ArrowLeft, AlertCircle, Check, FingerprintPattern as Fingerprint } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AdminRegisterModal from '@/components/admin/AdminRegisterModal';
import AdminForgotPasswordModal from '@/components/admin/AdminForgotPasswordModal';
import ResendEmailVerificationModal from '@/components/admin/ResendEmailVerificationModal';
import { flexibleAdminLogin, validateIdentifierFormat, searchAdminByIdentifier } from '@/services/admin-flexible-auth';
import { isPasskeySupported, signInAdminWithPasskey, isPasskeyAvailable, checkAdminPasskeyForIdentifier } from '@/services/admin-webauthn';

interface AdminLoginFormProps {
  onAuthSuccess: () => void;
}

export default function AdminLoginForm({ onAuthSuccess }: AdminLoginFormProps) {
  const [password, setPassword] = useState('');
  const [identifier, setIdentifier] = useState(''); // email, @username ou telefone
  const [identifierValidation, setIdentifierValidation] = useState<{ valid: boolean; type: string; message: string } | null>(null);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [isRegisterOpen, setRegisterOpen] = useState(false);
  const [isForgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [isResendEmailOpen, setResendEmailOpen] = useState(false);
  const [emailNotVerifiedEmail, setEmailNotVerifiedEmail] = useState('');
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [isPasskeyLoggingIn, setIsPasskeyLoggingIn] = useState(false);
  const [isCheckingIdentifierPasskey, setIsCheckingIdentifierPasskey] = useState(false);
  const [passkeyRegisteredForIdentifier, setPasskeyRegisteredForIdentifier] = useState<boolean | null>(null);
  const canUsePasskeyLogin =
    passkeySupported &&
    passkeyAvailable &&
    !isCheckingIdentifierPasskey &&
    passkeyRegisteredForIdentifier !== false;

  // Check passkey support on mount
  useEffect(() => {
    const checkPasskeySupport = async () => {
      const supported = isPasskeySupported();
      setPasskeySupported(supported);
      
      if (supported) {
        const available = await isPasskeyAvailable();
        setPasskeyAvailable(available);
      }
    };
    
    checkPasskeySupport();
  }, []);

  useEffect(() => {
    if (!passkeySupported) {
      setPasskeyRegisteredForIdentifier(null);
      setIsCheckingIdentifierPasskey(false);
      return;
    }

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      setPasskeyRegisteredForIdentifier(null);
      setIsCheckingIdentifierPasskey(false);
      return;
    }

    let isActive = true;
    const timerId = window.setTimeout(async () => {
      setIsCheckingIdentifierPasskey(true);
      try {
        const hasPasskey = await checkAdminPasskeyForIdentifier(normalizedIdentifier);
        if (isActive) {
          setPasskeyRegisteredForIdentifier(hasPasskey);
        }
      } catch {
        if (isActive) {
          setPasskeyRegisteredForIdentifier(null);
        }
      } finally {
        if (isActive) {
          setIsCheckingIdentifierPasskey(false);
        }
      }
    }, 450);

    return () => {
      isActive = false;
      window.clearTimeout(timerId);
    };
  }, [identifier, passkeySupported]);

  // Validar identificador em tempo real
  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    const validation = validateIdentifierFormat(value);
    setIdentifierValidation(validation.valid ? validation : null);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError('');

    try {
      if (!identifier.trim() || !password) {
        setError('Informe seu email, @username, telefone e senha.');
        setIsLoggingIn(false);
        return;
      }

      console.log('[Admin Login Flexível] Tentativa de login:', { identifier });

      // Usar autenticação flexível
      const result = await flexibleAdminLogin(identifier, password);
      const user = result.user;

      if (!user.emailVerified) {
        console.warn('[Admin Login] E-mail não verificado');
        // preparar modal antes de efetuar logout, evitando possível remount
        setEmailNotVerifiedEmail(user.email || identifier);
        setResendEmailOpen(true);
        // mantém mensagem de erro na tela de login
        setError('Confirme seu e-mail antes de acessar o painel.');
        // não exibimos notificações em toast, o modal expõe o botão de reenvio
        setIsAuthenticated(false);
        await signOut(auth);
        setIsLoggingIn(false);
        return;
      }

      const adminData = result.admin;
      if (adminData.status && adminData.status !== 'active') {
        console.warn('[Admin Login] Conta admin bloqueada:', { uid: user.uid, status: adminData.status });
        await signOut(auth);
        throw new Error('ADMIN_DISABLED');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminUser', user.email || '');
        localStorage.setItem('adminUid', user.uid);
        document.cookie = `isAuthenticated=true; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `isAdmin=true; path=/; max-age=86400; SameSite=Lax`;
      }

      toast({ title: 'Login bem-sucedido!', description: `Bem-vindo ${adminData.name}!` });
      setIsAuthenticated(true);
      onAuthSuccess();
    } catch (err: unknown) {
      console.error('[Admin Login] Erro ao autenticar:', err);

      let message = 'Não foi possível entrar. Verifique as credenciais.';
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const { code } = err as { code?: string };
        if (code === 'auth/user-not-found') message = 'Identificador não encontrado.';
        else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') message = 'Identificador ou senha incorretos.';
        else if (code === 'auth/too-many-requests') message = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        else if (code === 'auth/network-request-failed') message = 'Erro de rede. Tente novamente em instantes.';
      } else if (err instanceof Error) {
        if (err.message === 'ADMIN_NOT_REGISTERED') {
          message = 'Sua conta não possui acesso de administrador.';
        } else if (err.message === 'ADMIN_DISABLED') {
          message = 'Conta de administrador desativada. Procure o suporte.';
        } else {
          message = err.message || message;
        }
      }

      setError(message);
      setIsAuthenticated(false);
      toast({ variant: 'destructive', title: 'Falha na autenticação', description: message });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterClick = () => {
    if (isAuthenticated) {
      toast({
        title: "Você já está autenticado",
        description: "Não é necessário criar uma nova conta."
      });
      return;
    }
    setRegisterOpen(true);
  };

  const handleForgotPasswordClick = () => {
    if (isAuthenticated) {
      toast({
        title: "Você já está autenticado",
        description: "Não é necessário recuperar a senha."
      });
      return;
    }
    setForgotPasswordOpen(true);
  };

  const handlePasskeyLogin = async () => {
    if (!passkeySupported) {
      toast({
        variant: 'destructive',
        title: 'Não suportado',
        description: 'Chaves de acesso não são suportadas neste navegador.'
      });
      return;
    }

    setIsPasskeyLoggingIn(true);
    setError('');

    try {
      const passkeyIdentifier = identifier.trim();
      if (!passkeyIdentifier) {
        throw new Error('Informe email, @username ou telefone para entrar com chave de acesso.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('adminPasskeyIdentifier', passkeyIdentifier);
      }

      const hasRegisteredPasskey = await checkAdminPasskeyForIdentifier(passkeyIdentifier);
      if (!hasRegisteredPasskey) {
        throw new Error('Nenhuma chave de acesso cadastrada para este usuário. Cadastre em Admin > Configurações > Segurança.');
      }

      console.log('[Admin Login] Attempting passkey authentication...');
      const result = await signInAdminWithPasskey(passkeyIdentifier);
      const user = result.user;
      const adminData = result.admin;
 
      // if email is not verified, treat like normal login flow
      if (!user.emailVerified) {
        console.warn('[Admin Login] E-mail não verificado (passkey)');
        setEmailNotVerifiedEmail(user.email || passkeyIdentifier);
        setResendEmailOpen(true);
        setError('Confirme seu e-mail antes de acessar o painel.');
        setIsAuthenticated(false);
        await signOut(auth);
        setIsPasskeyLoggingIn(false);
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminUser', user.email || '');
        localStorage.setItem('adminUid', user.uid);
        document.cookie = `isAuthenticated=true; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `isAdmin=true; path=/; max-age=86400; SameSite=Lax`;
      }

      toast({ 
        title: 'Login bem-sucedido com chave de acesso!', 
        description: `Bem-vindo ${adminData.name || user.email}!` 
      });
      setIsAuthenticated(true);
      onAuthSuccess();
    } catch (err: unknown) {
      console.error('[Admin Login] Erro ao autenticar com passkey:', err);

      let message = 'Não foi possível entrar com a chave de acesso.';
      if (err instanceof Error) {
        if (err.message === 'ADMIN_NOT_REGISTERED') {
          message = 'Sua conta não possui acesso de administrador.';
        } else if (err.message === 'ADMIN_DISABLED') {
          message = 'Conta de administrador desativada. Procure o suporte.';
        } else if (err.message.includes('cancelada') || err.message.includes('não permitida')) {
          message = 'Autenticação cancelada ou não permitida.';
        } else if (err.message.includes('não encontrada')) {
          message = 'Nenhuma chave de acesso encontrada para este dispositivo.';
        } else {
          message = err.message || message;
        }
      }

      setError(message);
      toast({ variant: 'destructive', title: 'Falha na autenticação', description: message });
    } finally {
      setIsPasskeyLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-sm bg-zinc-950 border-white/10">
        <CardHeader className="text-center relative">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => router.push('/')}>
            <ArrowLeft />
            <span className="sr-only">Voltar para a página inicial</span>
          </Button>
          <div className="flex justify-center mb-4 pt-8">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acesso Restrito ao Painel</CardTitle>
          <CardDescription>
            Insira suas credenciais de administrador.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email, @Username ou Telefone</Label>
            <div className="relative">
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="seu@email.com ou @nickname ou +55 11 99999-9999"
                className={identifierValidation ? (identifierValidation.valid ? 'border-green-500' : 'border-red-500') : ''}
              />
              {identifier && identifierValidation && (
                <div className="absolute right-3 top-3">
                  {identifierValidation.valid ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {identifier && identifierValidation && (
              <p className={`text-xs ${identifierValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                {identifierValidation.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              💡 Use seu email, nome de usuário com @ ou telefone para entrar
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="********"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter className="flex-col items-center gap-3">
          <Button
            type="button"
            className="w-full"
            onClick={handleLogin}
            disabled={isLoggingIn || isPasskeyLoggingIn || !identifier || !password}
          >
            <Lock className="mr-2 h-4 w-4" />
            {isLoggingIn ? 'Verificando...' : 'Entrar'}
          </Button>
          
          <>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handlePasskeyLogin}
              disabled={isLoggingIn || isPasskeyLoggingIn || !canUsePasskeyLogin || !identifier.trim()}
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              {isPasskeyLoggingIn ? 'Autenticando...' : 'Entrar com Chave de Acesso'}
            </Button>

            {!passkeySupported ? (
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ Chave de acesso indisponível neste navegador/domínio.
              </p>
            ) : isCheckingIdentifierPasskey && identifier.trim() ? (
              <p className="text-xs text-muted-foreground text-center">
                🔎 Verificando chave de acesso para este usuário...
              </p>
            ) : identifier.trim() && passkeyRegisteredForIdentifier === false ? (
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ Nenhuma chave cadastrada para este usuário. Cadastre em Admin &gt; Configurações &gt; Segurança.
              </p>
            ) : !passkeyAvailable ? (
              <p className="text-xs text-muted-foreground text-center">
                💡 Cadastre sua chave em Admin &gt; Configurações &gt; Segurança.
              </p>
            ) : null}
          </>
          
          {!isAuthenticated && (
            <div className="mt-2 text-center text-sm">
              <button
                className="underline hover:text-primary"
                onClick={handleRegisterClick}
              >
                Cadastre-se como admin
              </button>
              <span className="mx-2">/</span>
              <button
                className="underline hover:text-primary"
                onClick={handleForgotPasswordClick}
              >
                Esqueci minha senha
              </button>
            </div>
          )}
        </CardFooter>
      </Card>
      <AdminRegisterModal open={isRegisterOpen} onOpenChange={setRegisterOpen} />
      <AdminForgotPasswordModal open={isForgotPasswordOpen && !isAuthenticated} onOpenChange={setForgotPasswordOpen} />
      <ResendEmailVerificationModal
        open={isResendEmailOpen}
        onOpenChange={(open) => {
          setResendEmailOpen(open);
          if (!open) setEmailNotVerifiedEmail('');
        }}
        defaultEmail={emailNotVerifiedEmail}
      />
    </div>
  );
}
