'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';

type ServiceDefinition = {
  id: string;
  name: string;
  description: string;
  active: boolean;
};

const SERVICES: ServiceDefinition[] = [
  {
    id: 'delete-auth-user-service',
    name: 'Remover usuário (Auth)',
    description: 'Exclui o usuário na autenticação.',
    active: true
  },
  {
    id: 'delete-user-data-service',
    name: 'Apagar dados do usuário',
    description: 'Remove dados pessoais do usuário no banco.',
    active: true
  },
  {
    id: 'search-user-data-service',
    name: 'Buscar dados do usuário',
    description: 'Pesquisa por ID ou email para localizar usuários.',
    active: true
  },
  {
    id: 'grant-free-days-service',
    name: 'Conceder dias grátis',
    description: 'Adiciona dias de cortesia na assinatura.',
    active: true
  },
  {
    id: 'send-password-reset-service',
    name: 'Reset de senha',
    description: 'Envia e-mail de redefinição de senha.',
    active: true
  },
  {
    id: 'activate-subscription-service',
    name: 'Ativar assinatura',
    description: 'Ativa ou troca o plano do usuário.',
    active: true
  },
  {
    id: 'update-user-service',
    name: 'Atualizar usuário',
    description: 'Atualiza dados de perfil do usuário.',
    active: true
  },
  {
    id: 'clear-data-external-service',
    name: 'Limpar dados externos',
    description: 'Limpa cache e dados temporários externos.',
    active: true
  },
  {
    id: 'schedule-service',
    name: 'Agendamento',
    description: 'Confirma e agenda ações automáticas.',
    active: true
  },
  {
    id: 'getUserInfo',
    name: 'Buscar informações do usuário',
    description: 'Consulta dados detalhados do usuário por ID ou email.',
    active: true
  },
  {
    id: 'checkSubscription',
    name: 'Verificar assinatura',
    description: 'Checa o status da assinatura do usuário.',
    active: true
  },
  {
    id: 'giftSubscriptionDays',
    name: 'Presentear dias de assinatura',
    description: 'Concede dias extras de assinatura por email.',
    active: true
  },
  {
    id: 'sendSecretChatTextMessage',
    name: 'Mensagem no chat secreto',
    description: 'Envia mensagem de texto como admin no chat secreto.',
    active: true
  },
  {
    id: 'deleteSubscriber',
    name: 'Cancelar/remover assinante',
    description: 'Remove assinante e encerra a assinatura.',
    active: true
  },
  {
    id: 'cleanupExpiredSubscribers',
    name: 'Limpar assinantes expirados',
    description: 'Marca assinaturas expiradas automaticamente.',
    active: true
  },
  {
    id: 'purgeExpiredSubscribers',
    name: 'Remover expirados antigos',
    description: 'Remove registros antigos de assinaturas expiradas.',
    active: true
  },
  {
    id: 'resendAccountConfirmationEmail',
    name: 'Reenviar confirmacao de conta',
    description: 'Reenvia o email de confirmacao da conta.',
    active: true
  },
  {
    id: 'resendMfaOtp',
    name: 'Reenviar MFA (OTP)',
    description: 'Reenvia o codigo MFA via SMS.',
    active: true
  },
  {
    id: 'sendMessage',
    name: 'Enviar mensagem',
    description: 'Envia mensagens (texto ou midia) em canais sociais.',
    active: true
  },
  {
    id: 'broadcastMessage',
    name: 'Enviar mensagem em massa',
    description: 'Dispara mensagens para grupos ou todos os usuarios.',
    active: true
  },
  {
    id: 'scheduleTask',
    name: 'Agendar tarefas',
    description: 'Agenda mensagens ou tarefas futuras.',
    active: true
  },
  {
    id: 'schedulePublication',
    name: 'Agendar publicacao',
    description: 'Agenda publicacoes de fotos ou videos.',
    active: true
  },
  {
    id: 'sendEmail',
    name: 'Enviar email',
    description: 'Envia emails transacionais ou comunicados.',
    active: true
  },
  {
    id: 'createPixPayment',
    name: 'Criar pagamento PIX',
    description: 'Gera cobranca PIX para o usuario.',
    active: true
  },
  {
    id: 'createPayPalPayment',
    name: 'Criar pagamento PayPal',
    description: 'Gera cobranca PayPal para o usuario.',
    active: true
  },
  {
    id: 'getExclusiveContent',
    name: 'Listar conteudo exclusivo',
    description: 'Consulta o conteudo exclusivo disponivel.',
    active: true
  },
  {
    id: 'getReviews',
    name: 'Buscar avaliacoes',
    description: 'Busca reviews e avaliacoes da plataforma.',
    active: true
  },
  {
    id: 'getPlatformStats',
    name: 'Estatisticas da plataforma',
    description: 'Gera estatisticas e insights da plataforma.',
    active: true
  },
  {
    id: 'getSystemStatus',
    name: 'Status dos servicos',
    description: 'Consulta o status dos microsservicos.',
    active: true
  },
  {
    id: 'sendPasswordReset',
    name: 'Reset de senha (IA)',
    description: 'Envia link de redefinicao de senha.',
    active: true
  },
  {
    id: 'verifyAdminIdentityMedia',
    name: 'Verificar admin por foto/video',
    description: 'Recebe fotos ou videos para validar identidade e evitar perfil fake.',
    active: true
  }
];

export default function AdminCerebroCentralIaPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [servicePermissions, setServicePermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);

  const activeServices = useMemo(() => SERVICES.filter((service) => service.active), []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/profile-settings', { cache: 'no-store' });
      const data = await response.json();
      setSettings(data);
      setServicePermissions(data?.cerebroCentralServices || {});
    } catch (error) {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as configurações do Cérebro Central IA.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleTogglePermission = async (serviceId: string) => {
    if (!settings) return;
    const nextAllowed = !(servicePermissions?.[serviceId] ?? true);
    const nextPermissions = { ...servicePermissions, [serviceId]: nextAllowed };

    setServicePermissions(nextPermissions);
    setSavingServiceId(serviceId);

    try {
      const response = await fetch('/api/admin/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...settings,
            cerebroCentralServices: nextPermissions
          }
        })
      });
      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.message || 'Falha ao salvar');
      }
      setSettings((prev) => (prev ? { ...prev, cerebroCentralServices: nextPermissions } : prev));
      toast({
        title: nextAllowed ? 'Serviço permitido' : 'Serviço negado',
        description: `Alteração aplicada para ${serviceId}.`
      });
    } catch (error) {
      setServicePermissions((prev) => ({ ...prev, [serviceId]: !(nextAllowed) }));
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar a permissão do serviço.',
        variant: 'destructive'
      });
    } finally {
      setSavingServiceId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Cérebro Central IA</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie os serviços ativos do Cérebro Central IA e defina se cada um pode executar ações.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">Serviços ativos</CardTitle>
          <CardDescription>
            Use "Permitir" ou "Negar" para controlar o acesso de cada serviço.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando serviços...
            </div>
          ) : (
            <div className="space-y-3">
              {activeServices.map((service) => {
                const isAllowed = servicePermissions?.[service.id] ?? true;
                const isSaving = savingServiceId === service.id;

                return (
                  <div
                    key={service.id}
                    className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{service.name}</h3>
                        <Badge variant={isAllowed ? 'secondary' : 'destructive'}>
                          {isAllowed ? 'Permitido' : 'Negado'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                      <p className="text-xs text-muted-foreground">ID: {service.id}</p>
                    </div>
                    <Button
                      type="button"
                      variant={isAllowed ? 'destructive' : 'outline'}
                      onClick={() => handleTogglePermission(service.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isAllowed ? (
                        'Negar'
                      ) : (
                        'Permitir'
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
