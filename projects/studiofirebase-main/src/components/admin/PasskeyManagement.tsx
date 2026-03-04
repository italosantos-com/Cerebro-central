"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FingerprintPattern as Fingerprint, ShieldCheck, Trash2, Plus } from 'lucide-react';
import { auth } from '@/lib/firebase';
import {
  isPasskeySupported,
  registerAdminPasskey,
  hasAdminPasskey,
  removeAdminPasskey,
} from '@/services/admin-webauthn';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PasskeyManagementProps {
  userId?: string;
}

export default function PasskeyManagement({ userId }: PasskeyManagementProps) {
  const { toast } = useToast();
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    const checkPasskeyStatus = async () => {
      const supported = isPasskeySupported();
      setPasskeySupported(supported);

      if (supported && auth.currentUser) {
        const uid = userId || auth.currentUser.uid;
        // Only check passkey status if we have a valid UID
        if (uid && typeof uid === 'string' && uid.trim() !== '') {
          const passkeyExists = await hasAdminPasskey(uid);
          setHasPasskey(passkeyExists);
        }
      }

      setIsLoading(false);
    };

    checkPasskeyStatus();
  }, [userId]);

  const handleRegisterPasskey = async () => {
    if (!auth.currentUser) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado'
      });
      return;
    }

    setIsRegistering(true);

    try {
      const uid = userId || auth.currentUser.uid;
      const displayName = auth.currentUser.displayName || auth.currentUser.email || 'Admin';
      
      await registerAdminPasskey(uid, displayName);
      
      setHasPasskey(true);
      toast({
        title: 'Chave de acesso registrada!',
        description: 'Agora você pode fazer login rapidamente usando biometria ou PIN do dispositivo.'
      });
    } catch (error: any) {
      console.error('[PasskeyManagement] Error registering passkey:', error);
      
      let message = 'Não foi possível registrar a chave de acesso.';
      if (error.message) {
        message = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar',
        description: message
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRemovePasskey = async () => {
    if (!auth.currentUser) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado'
      });
      return;
    }

    setIsRemoving(true);

    try {
      const uid = userId || auth.currentUser.uid;
      await removeAdminPasskey(uid);
      
      setHasPasskey(false);
      toast({
        title: 'Chave de acesso removida',
        description: 'A chave de acesso foi removida com sucesso.'
      });
    } catch (error: any) {
      console.error('[PasskeyManagement] Error removing passkey:', error);
      
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: error.message || 'Não foi possível remover a chave de acesso.'
      });
    } finally {
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Cadastro de Chave de Acesso (Passkey)
          </CardTitle>
          <CardDescription>
            Carregando...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!passkeySupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Cadastro de Chave de Acesso (Passkey)
          </CardTitle>
          <CardDescription>
            Chaves de acesso não são suportadas neste navegador ou dispositivo.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Cadastro de Chave de Acesso (Passkey)
        </CardTitle>
        <CardDescription>
          {hasPasskey 
            ? 'Use sua biometria ou PIN do dispositivo para login rápido e seguro.'
            : 'Configure uma chave de acesso para login sem senha usando biometria ou PIN do dispositivo.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasPasskey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
              <ShieldCheck className="h-8 w-8 text-green-600" />
              <div className="flex-1">
                <p className="font-medium">Chave de acesso ativa</p>
                <p className="text-sm text-muted-foreground">
                  Login rápido habilitado neste dispositivo
                </p>
              </div>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  disabled={isRemoving}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isRemoving ? 'Removendo...' : 'Remover Chave de Acesso'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover chave de acesso?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você não poderá mais fazer login com biometria ou PIN neste dispositivo. 
                    Ainda será possível fazer login com senha.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemovePasskey}>
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Benefícios das Chaves de Acesso:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Login rápido sem digitar senha</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Mais seguro que senhas tradicionais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Use biometria (Face ID, Touch ID, impressão digital)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Proteção contra phishing</span>
                </li>
              </ul>
            </div>
            
            <Button 
              className="w-full"
              onClick={handleRegisterPasskey}
              disabled={isRegistering}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isRegistering ? 'Registrando...' : 'Configurar Chave de Acesso'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
