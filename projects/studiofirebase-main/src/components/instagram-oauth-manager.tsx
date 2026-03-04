'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Instagram, Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  thumbnail_url?: string;
}

interface InstagramAccount {
  id: string;
  username: string;
  account_type?: string;
  media_count?: number;
}

interface InstagramConnectionStatus {
  connected: boolean;
  account?: InstagramAccount;
  tokenExpiry?: string;
  lastRefresh?: string;
}

export default function InstagramOAuthManager() {
  const { toast } = useToast();
  const [status, setStatus] = useState<InstagramConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Verificar status da conexão
  useEffect(() => {
    checkConnectionStatus();
  }, []); // Executar apenas na montagem

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/instagram/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus({
          connected: data.connected,
          account: data.account,
          tokenExpiry: data.tokenExpiry,
          lastRefresh: data.lastRefresh
        });

        // Se conectado, carregar media automaticamente
        if (data.connected) {
          loadMedia();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar OAuth flow
  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
    const redirectUri = `${window.location.origin}/api/instagram/callback`;
    const scope = 'user_profile,user_media';
    
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
    
    // Abrir popup para OAuth
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl,
      'Instagram OAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Escutar mensagem de callback
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
        popup?.close();
        toast({
          title: '✅ Conectado ao Instagram',
          description: 'Sua conta foi conectada com sucesso!'
        });
        checkConnectionStatus();
      } else if (event.data.type === 'INSTAGRAM_AUTH_ERROR') {
        popup?.close();
        toast({
          variant: 'destructive',
          title: '❌ Erro na conexão',
          description: event.data.message
        });
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Cleanup
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        window.removeEventListener('message', handleMessage);
      }
    }, 500);
  };

  // Desconectar conta
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/instagram/disconnect', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus({ connected: false });
        setMedia([]);
        toast({
          title: '✅ Desconectado',
          description: 'Sua conta do Instagram foi desconectada.'
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '❌ Erro ao desconectar',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh token
  const handleRefreshToken = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/instagram/refresh-token', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '✅ Token atualizado',
          description: 'Seu token de acesso foi renovado com sucesso.'
        });
        checkConnectionStatus();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '❌ Erro ao atualizar token',
        description: error.message
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Carregar media do Instagram
  const loadMedia = async () => {
    try {
      setLoadingMedia(true);
      const response = await fetch('/api/instagram/media');
      const data = await response.json();
      
      if (data.success) {
        setMedia(data.media || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '❌ Erro ao carregar mídia',
        description: error.message
      });
    } finally {
      setLoadingMedia(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card de Status da Conexão */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-6 w-6 text-pink-500" />
              <CardTitle>Integração Instagram</CardTitle>
            </div>
            {status.connected ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Desconectado
              </Badge>
            )}
          </div>
          <CardDescription>
            {status.connected 
              ? `Conectado como @${status.account?.username}`
              : 'Conecte sua conta do Instagram para exibir suas fotos'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.connected ? (
            <>
              {/* Informações da conta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-semibold">@{status.account?.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Conta</p>
                  <p className="font-semibold">{status.account?.account_type || 'PERSONAL'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Mídia</p>
                  <p className="font-semibold">{status.account?.media_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Token Expira em</p>
                  <p className="font-semibold text-xs">
                    {status.tokenExpiry 
                      ? new Date(status.tokenExpiry).toLocaleDateString('pt-BR')
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleRefreshToken} 
                  disabled={refreshing}
                  variant="outline"
                  className="flex-1"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Renovar Token
                </Button>
                <Button 
                  onClick={handleDisconnect}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </div>

              {/* Alerta sobre expiração */}
              {status.tokenExpiry && new Date(status.tokenExpiry) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Token expirando em breve</AlertTitle>
                  <AlertDescription>
                    Seu token de acesso expira em menos de 7 dias. Renove-o para manter a integração ativa.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Button onClick={handleConnect} className="w-full" size="lg">
              <Instagram className="h-5 w-5 mr-2" />
              Conectar com Instagram
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Galeria de Mídia */}
      {status.connected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Galeria Instagram</CardTitle>
              <Button 
                onClick={loadMedia} 
                disabled={loadingMedia}
                variant="outline"
                size="sm"
              >
                {loadingMedia ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar
              </Button>
            </div>
            <CardDescription>
              Suas últimas postagens do Instagram
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMedia ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : media.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma mídia encontrada
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {media.map((item) => (
                  <a
                    key={item.id}
                    href={item.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-lg border border-primary/20 hover:border-primary hover:shadow-lg transition-all"
                  >
                    <Image
                      src={item.media_type === 'VIDEO' ? item.thumbnail_url || item.media_url : item.media_url}
                      alt={item.caption || 'Instagram Post'}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    {item.media_type === 'VIDEO' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="bg-white/90 rounded-full p-2">
                          <svg className="h-6 w-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {item.caption && (
                        <p className="text-white text-xs font-bold line-clamp-2">
                          {item.caption}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
