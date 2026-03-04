'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { Eye, EyeOff, Database, RefreshCw } from 'lucide-react';

export default function SubscriptionDebug() {
  const [isVisible, setIsVisible] = useState(false);
  const [databaseData, setDatabaseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { isAuthenticated, userEmail: faceUserEmail, userType } = useFaceIDAuth();
  const { user: firebaseUser, userProfile } = useAuth();

  const userEmail = faceUserEmail || firebaseUser?.email || userProfile?.email;

  const checkDatabase = async () => {
    if (!userEmail) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', email: userEmail })
      });
      
      const data = await response.json();
      setDatabaseData(data);
    } catch (error) {
      console.error('Erro ao verificar banco:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fixDatabase = async () => {
    if (!userEmail) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix', email: userEmail })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('✅ Banco de dados corrigido! Recarregando...');
        window.location.reload();
      } else {
        alert('❌ Erro: ' + data.message);
      }
    } catch (error) {
      console.error('Erro ao corrigir banco:', error);
      alert('❌ Erro ao corrigir banco de dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible && userEmail && !databaseData) {
      checkDatabase();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, userEmail]); // checkDatabase e databaseData são estáveis

  if (process.env.NODE_ENV !== 'development') {
    return null; // Só mostrar em desenvolvimento
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-white shadow-lg"
        >
          <Eye className="w-4 h-4 mr-2" />
          Debug
        </Button>
      ) : (
        <Card className="w-96 max-h-96 overflow-y-auto shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Debug de Assinatura</CardTitle>
              <Button
                onClick={() => setIsVisible(false)}
                size="sm"
                variant="ghost"
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3 text-xs">
            {/* Dados Locais */}
            <div>
              <h4 className="font-semibold mb-2">📱 Dados Locais:</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Context Auth:</span>
                  <Badge variant={isAuthenticated ? "default" : "destructive"}>
                    {isAuthenticated ? "✅" : "❌"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Firebase User:</span>
                  <Badge variant={firebaseUser?.email ? "default" : "destructive"}>
                    {firebaseUser?.email ? "✅" : "❌"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>User Profile:</span>
                  <Badge variant={userProfile?.isSubscriber ? "default" : "destructive"}>
                    {userProfile?.isSubscriber ? "✅" : "❌"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>localStorage:</span>
                  <Badge variant={localStorage.getItem('hasSubscription') === 'true' ? "default" : "destructive"}>
                    {localStorage.getItem('hasSubscription') === 'true' ? "✅" : "❌"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Dados do Banco */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">🗄️ Banco de Dados:</h4>
                <Button
                  onClick={checkDatabase}
                  size="sm"
                  variant="ghost"
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {databaseData ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Users Collection:</span>
                    <Badge variant={databaseData.data?.users?.isSubscriber ? "default" : "destructive"}>
                      {databaseData.data?.users?.isSubscriber ? "✅" : "❌"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Subscribers Collection:</span>
                    <Badge variant={databaseData.data?.subscribers?.length > 0 ? "default" : "destructive"}>
                      {databaseData.data?.subscribers?.length > 0 ? "✅" : "❌"}
                    </Badge>
                  </div>
                  
                  {databaseData.data?.users && (
                    <div className="text-xs bg-gray-50 p-2 rounded">
                      <strong>Status:</strong> {databaseData.data.users.subscriptionStatus || 'N/A'}<br/>
                      <strong>Fim:</strong> {databaseData.data.users.subscriptionEndDate ? 
                        new Date(databaseData.data.users.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Clique em ↻ para verificar</p>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2 pt-2 border-t">
              <Button
                onClick={fixDatabase}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading || !userEmail}
              >
                <Database className="w-3 h-3 mr-2" />
                Corrigir Banco de Dados
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Email: {userEmail || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
