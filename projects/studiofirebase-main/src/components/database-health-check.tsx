'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Wrench,
  Users,
  CreditCard,
  Image as ImageIcon,
  Video
} from 'lucide-react';

interface HealthData {
  timestamp: string;
  collections: {
    users?: any;
    subscribers?: any;
    photos?: any;
    videos?: any;
  };
  consistency?: any;
  issues: string[];
  healthy: boolean;
}

export default function DatabaseHealthCheck() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/database-health');
      const data = await response.json();
      
      if (data.success) {
        setHealthData(data.data);
      } else {
        console.error('Erro ao verificar saúde do banco:', data.message);
      }
    } catch (error) {
      console.error('Erro na verificação:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fixIssues = async () => {
    setIsFixing(true);
    try {
      const response = await fetch('/api/database-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix-all' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.message}\n\n${data.fixes.join('\n')}`);
        // Verificar novamente após correção
        await checkHealth();
      } else {
        alert('❌ Erro ao corrigir: ' + data.message);
      }
    } catch (error) {
      console.error('Erro na correção:', error);
      alert('❌ Erro na correção. Veja o console.');
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getStatusBadge = (healthy: boolean) => {
    return (
      <Badge variant={healthy ? "default" : "destructive"}>
        {healthy ? "✅ Saudável" : "❌ Com Problemas"}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            <CardTitle>Verificação de Integridade do Banco</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={checkHealth}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Verificar
            </Button>
            {healthData && !healthData.healthy && (
              <Button
                onClick={fixIssues}
                disabled={isFixing}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Wrench className={`w-4 h-4 mr-2 ${isFixing ? 'animate-spin' : ''}`} />
                Corrigir Tudo
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!healthData ? (
          <div className="text-center py-8">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Clique em &quot;Verificar&quot; para analisar a integridade do banco de dados
            </p>
          </div>
        ) : (
          <>
            {/* Status Geral */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(healthData.healthy)}
                <div>
                  <h3 className="font-semibold">Status Geral</h3>
                  <p className="text-sm text-muted-foreground">
                    Última verificação: {new Date(healthData.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              {getStatusBadge(healthData.healthy)}
            </div>

            {/* Problemas Encontrados */}
            {healthData.issues.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Problemas encontrados:</strong>
                  <ul className="mt-2 space-y-1">
                    {healthData.issues.map((issue, index) => (
                      <li key={index} className="text-sm">• {issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Coleções */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Users Collection */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <h4 className="font-semibold">Usuários</h4>
                    </div>
                    {healthData.collections.users && getStatusIcon(healthData.collections.users.exists)}
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  {healthData.collections.users ? (
                    <div className="space-y-2">
                      <p><strong>Total:</strong> {healthData.collections.users.count}</p>
                      {healthData.collections.users.sample && (
                        <div>
                          <strong>Amostra:</strong>
                          <ul className="mt-1 space-y-1 text-xs">
                            {healthData.collections.users.sample.slice(0, 3).map((user: any, i: number) => (
                              <li key={i} className="flex justify-between">
                                <span>{user.email}</span>
                                <Badge variant={user.isSubscriber ? "default" : "secondary"} className="text-xs">
                                  {user.isSubscriber ? "✅" : "❌"}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-600">❌ Erro ao acessar coleção</p>
                  )}
                </CardContent>
              </Card>

              {/* Subscribers Collection */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <h4 className="font-semibold">Assinaturas</h4>
                    </div>
                    {healthData.collections.subscribers && getStatusIcon(healthData.collections.subscribers.exists)}
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  {healthData.collections.subscribers ? (
                    <div className="space-y-2">
                      <p><strong>Total:</strong> {healthData.collections.subscribers.count}</p>
                      {healthData.collections.subscribers.sample && (
                        <div>
                          <strong>Amostra:</strong>
                          <ul className="mt-1 space-y-1 text-xs">
                            {healthData.collections.subscribers.sample.slice(0, 3).map((sub: any, i: number) => (
                              <li key={i} className="flex justify-between">
                                <span>{sub.email}</span>
                                <Badge variant={sub.status === 'active' ? "default" : "secondary"} className="text-xs">
                                  {sub.status}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-600">❌ Erro ao acessar coleção</p>
                  )}
                </CardContent>
              </Card>

              {/* Photos Collection */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      <h4 className="font-semibold">Fotos</h4>
                    </div>
                    {healthData.collections.photos && getStatusIcon(healthData.collections.photos.exists)}
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <p><strong>Total:</strong> {healthData.collections.photos?.count || 0}</p>
                </CardContent>
              </Card>

              {/* Videos Collection */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      <h4 className="font-semibold">Vídeos</h4>
                    </div>
                    {healthData.collections.videos && getStatusIcon(healthData.collections.videos.exists)}
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <p><strong>Total:</strong> {healthData.collections.videos?.count || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Consistência */}
            {healthData.consistency && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Consistência de Dados</h4>
                    {getStatusIcon(healthData.consistency.consistent)}
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="flex justify-between">
                    <span>Usuários assinantes:</span>
                    <Badge variant="outline">{healthData.consistency.usersWithSubscription}</Badge>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span>Assinaturas ativas:</span>
                    <Badge variant="outline">{healthData.consistency.activeSubscribers}</Badge>
                  </div>
                  {!healthData.consistency.consistent && (
                    <p className="text-red-600 text-xs mt-2">
                      ⚠️ Números não batem - pode haver inconsistência
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
