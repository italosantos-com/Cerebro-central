"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { getSocialLoginErrorMessage, signInWithSocialProvider } from '@/lib/social-auth';

// Adicione este SVG como um componente ou use uma biblioteca de ícones
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-7.962l-6.571,4.819C9.656,39.663,16.318,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.022,44,30.022,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);


export default function GoogleIntegrationPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.uid) {
      // Idealmente, teríamos uma função como `hasGoogleIntegration(user.uid)`
      // que verifica no backend se os tokens existem.
      // Por simplicidade, vamos checar se o provider é 'google.com' no perfil.
      const checkConnection = async () => {
        setIsLoading(true);
        if (
          (user?.providerData || []).some((item) => item.providerId === 'google.com')
          || userProfile?.provider === 'google.com'
          || userProfile?.provider === 'google'
        ) {
            setIsConnected(true);
        } else {
            // Checar se a integração existe no subdocumento
            const integrationDoc = await getDoc(doc(db, `users/${user.uid}/integrations/google`));
            if (integrationDoc.exists()) {
                setIsConnected(true);
            }
        }
        setIsLoading(false);
      };
      checkConnection();
    }
  }, [user, userProfile]);

  const handleGoogleConnect = async () => {
    if (!user) {
      toast({ title: "Usuário não autenticado", description: "Você precisa estar logado para conectar sua conta.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signInWithSocialProvider('google');

      toast({
        title: "Sucesso!",
        description: "Sua conta Google foi conectada com sucesso.",
        variant: "default",
      });
      setIsConnected(true);

    } catch (err: any) {
      console.error("Erro ao conectar com o Google:", err);
      const message = getSocialLoginErrorMessage(err, 'google');
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
            <GoogleIcon />
            Integração com Google
          </CardTitle>
          <CardDescription>
            Conecte sua conta Google para um login mais rápido e seguro.
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
                            <p className="font-semibold">Sua conta Google está conectada!</p>
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
                    Ao conectar sua conta, você nos autoriza a acessar suas informações básicas de perfil,
                    como nome, e-mail e foto, de acordo com os termos de serviço do Google.
                  </p>
                  <Button 
                    onClick={handleGoogleConnect} 
                    disabled={isLoading} 
                    className="w-full max-w-xs mx-auto"
                    size="lg"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <GoogleIcon className="mr-2" />
                    )}
                    Conectar com Google
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
