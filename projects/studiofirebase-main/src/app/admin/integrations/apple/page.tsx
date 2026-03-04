"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, CheckCircle, Apple } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { getSocialLoginErrorMessage, signInWithSocialProvider } from '@/lib/social-auth';

export default function AppleIntegrationPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.uid) {
      const checkConnection = async () => {
        setIsLoading(true);
        if (
          (user?.providerData || []).some((item) => item.providerId === 'apple.com')
          || userProfile?.provider === 'apple.com'
          || userProfile?.provider === 'apple'
        ) {
          setIsConnected(true);
        } else {
          const integrationDoc = await getDoc(doc(db, `users/${user.uid}/integrations/apple`));
          if (integrationDoc.exists()) {
            setIsConnected(true);
          }
        }
        setIsLoading(false);
      };
      checkConnection();
    }
  }, [user, userProfile]);

  const handleAppleConnect = async () => {
    if (!user) {
      toast({ title: "Usuário não autenticado", description: "Você precisa estar logado para conectar sua conta.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signInWithSocialProvider('apple');
      toast({
        title: "Sucesso!",
        description: "Sua conta Apple foi conectada com sucesso.",
        variant: "default",
      });
      setIsConnected(true);

    } catch (err: any) {
      console.error("Erro ao conectar com a Apple:", err);
      const message = getSocialLoginErrorMessage(err, 'apple');
      setError(message);
      toast({ title: "Erro na Conexão", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const PageLoader = () => (
    <div className="flex justify-center items-center h-40">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  return (
    <main className="flex flex-1 w-full flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl animate-in fade-in-0 zoom-in-95 duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Apple className="h-6 w-6" />
            Integração com Apple
          </CardTitle>
          <CardDescription>
            Conecte sua conta Apple para habilitar o login com Apple no painel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(authLoading || isLoading) && <PageLoader />}

          {!authLoading && !isLoading && (
            <>
              {error && (
                <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-3 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4 text-green-600">
                    <CheckCircle className="h-6 w-6" />
                    <div>
                      <p className="font-semibold">Sua conta Apple está conectada!</p>
                      <p className="text-sm">Login rápido e seguro habilitado.</p>
                    </div>
                  </div>
                  {userProfile && (
                    <Card className="bg-card/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Perfil Conectado</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center gap-4">
                        {userProfile.photoURL && (
                          <Image
                            src={userProfile.photoURL}
                            alt="Foto do Perfil"
                            width={64}
                            height={64}
                            className="rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-lg">{userProfile.displayName}</p>
                          <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <p>
                    Conecte sua conta Apple para ativar e validar o fluxo de autenticação Apple neste ambiente administrativo.
                  </p>
                  <Button
                    onClick={handleAppleConnect}
                    disabled={isLoading}
                    className="w-full max-w-xs mx-auto"
                    size="lg"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Apple className="mr-2 h-5 w-5" />
                    )}
                    Conectar com Apple
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
