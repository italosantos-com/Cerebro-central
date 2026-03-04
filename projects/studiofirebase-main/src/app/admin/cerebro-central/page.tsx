'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';

type ServiceDefinition = {
  id: string;
  name: string;
  description: string;
  active: boolean;
};

type FraudAlertItem = {
  id: string;
  adminUid: string;
  existingAdminUid?: string | null;
  imageUrl?: string | null;
  createdAt?: any;
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

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return {} as Record<string, string>;
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export default function AdminCerebroCentralPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [servicePermissions, setServicePermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [conversationSettings, setConversationSettings] = useState<{ autoReplyEnabled: boolean; replyTone: 'humanized' | 'robotic' }>({
    autoReplyEnabled: false,
    replyTone: 'humanized',
  });
  const [trainingUploading, setTrainingUploading] = useState(false);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlertItem[]>([]);
  const [fraudAlertsLoading, setFraudAlertsLoading] = useState(false);
  const trainingInputRef = useRef<HTMLInputElement>(null);

  const activeServices = useMemo(() => SERVICES.filter((service) => service.active), []);

  const handleTrainingUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    setTrainingUploading(true);
    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/cerebro-central/admin-training/upload', {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Falha ao enviar imagem');
      }

      if (data?.duplicate) {
        toast({
          title: 'Possivel fraude detectada',
          description: 'Imagem ja existe. Aviso enviado ao admin e superadmin.',
          variant: 'destructive'
        });
        await loadFraudAlerts();
      } else {
        toast({
          title: 'Imagem enviada',
          description: 'Upload concluido para treino de IA.'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error?.message || 'Nao foi possivel enviar a imagem.',
        variant: 'destructive'
      });
    } finally {
      setTrainingUploading(false);
      event.target.value = '';
    }
  };

  const loadProfileSettings = async () => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        setSettings(null);
        setServicePermissions({});
        return;
      }

      const currentUid = auth.currentUser?.uid;
      const url = currentUid
        ? `/api/admin/profile-settings?adminUid=${encodeURIComponent(currentUid)}`
        : '/api/admin/profile-settings';

      const response = await fetch(url, {
        cache: 'no-store',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Falha ao carregar configurações (${response.status})`);
      }

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

  const fetchConversationSettings = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers?.Authorization) {
        setSettingsLoading(false);
        return;
      }

      const response = await fetch('/api/admin/conversation-settings', {
        headers,
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Falha ao carregar configurações de conversa');
      }

      const settings = data?.settings || {};
      setConversationSettings({
        autoReplyEnabled: Boolean(settings.autoReplyEnabled),
        replyTone: settings.replyTone === 'robotic' ? 'robotic' : 'humanized',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar automação',
        description: error?.message || 'Falha no servidor.',
      });
    } finally {
      setSettingsLoading(false);
    }
  }, [toast]);

  const loadFraudAlerts = useCallback(async () => {
    try {
      setFraudAlertsLoading(true);
      const user = auth.currentUser;
      if (!user?.uid) {
        setFraudAlerts([]);
        return;
      }
      const alertsQuery = query(
        collection(db, 'admin_fraud_alerts'),
        where('status', '==', 'open'),
        where('recipients', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(alertsQuery);
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() || {};
        return {
          id: docSnap.id,
          adminUid: data.adminUid || '',
          existingAdminUid: data.existingAdminUid || null,
          imageUrl: data.imageUrl || null,
          createdAt: data.createdAt || null,
        } as FraudAlertItem;
      });
      items.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
      setFraudAlerts(items);
    } catch (error) {
      console.error('[Admin Cerebro Central] Erro ao carregar alertas de fraude:', error);
    } finally {
      setFraudAlertsLoading(false);
    }
  }, []);

  const saveConversationSettings = useCallback(async (next: { autoReplyEnabled: boolean; replyTone: 'humanized' | 'robotic' }) => {
    setSettingsSaving(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/conversation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        credentials: 'include',
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Falha ao salvar configurações');
      }
      setConversationSettings({
        autoReplyEnabled: Boolean(data.settings?.autoReplyEnabled),
        replyTone: data.settings?.replyTone === 'robotic' ? 'robotic' : 'humanized',
      });
      toast({
        title: 'Configurações atualizadas',
        description: 'Automação de resposta atualizada com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar automação',
        description: error?.message || 'Falha no servidor.',
      });
    } finally {
      setSettingsSaving(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadProfileSettings();
    void fetchConversationSettings();
    void loadFraudAlerts();
  }, [fetchConversationSettings, loadFraudAlerts]);

  const handleTogglePermission = async (serviceId: string) => {
    if (!settings) return;
    const nextAllowed = !(servicePermissions?.[serviceId] ?? true);
    const nextPermissions = { ...servicePermissions, [serviceId]: nextAllowed };

    setServicePermissions(nextPermissions);
    setSavingServiceId(serviceId);

    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const currentUid = auth.currentUser?.uid;
      const response = await fetch('/api/admin/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        credentials: 'include',
        body: JSON.stringify({
          settings: {
            ...settings,
            cerebroCentralServices: nextPermissions
          },
          adminUid: currentUid
        })
      });

      if (!response.ok) {
        throw new Error(`Falha ao salvar (${response.status})`);
      }

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="rounded-xl bg-black/90 border border-white/10 p-4 backdrop-blur-sm space-y-2">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-white">Cérebro Central IA</h1>
          </div>
          <p className="text-white/60">
            Gerencie os serviços ativos do Cérebro Central IA e controle a automação de respostas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={trainingInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleTrainingUpload}
            disabled={trainingUploading}
          />
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => trainingInputRef.current?.click()}
              disabled={trainingUploading}
            >
              {trainingUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="mr-2 h-4 w-4" />
              )}
              Enviar imagem p/ IA
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Somente rosto do admin.
            </span>
          </div>
        </div>
      </div>

      {(fraudAlertsLoading || fraudAlerts.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alertas de fraude</CardTitle>
            <CardDescription>
              Imagens duplicadas detectadas no treino de IA para este admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fraudAlertsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando alertas...
              </div>
            ) : fraudAlerts.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum alerta aberto.</div>
            ) : (
              <div className="space-y-3">
                {fraudAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-md border border-border/60 p-3">
                    <div className="text-sm font-medium">Possível duplicidade detectada</div>
                    <div className="mt-1 text-xs text-muted-foreground break-all">
                      ID do alerta: {alert.id}
                    </div>
                    {alert.imageUrl ? (
                      <div className="mt-1 text-xs text-muted-foreground break-all">
                        Imagem: {alert.imageUrl}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Automação de Respostas</CardTitle>
          <CardDescription>
            Ajuste o estilo das respostas automáticas entre Humanizada ou Robótica.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {settingsLoading ? (
            <div className="text-sm text-muted-foreground">Carregando configurações...</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Resposta Automática</div>
                  <div className="text-xs text-muted-foreground">Liga/desliga respostas automáticas (por admin).</div>
                </div>
                <Switch
                  checked={conversationSettings.autoReplyEnabled}
                  disabled={settingsSaving}
                  onCheckedChange={(checked) => {
                    const next = { ...conversationSettings, autoReplyEnabled: checked };
                    setConversationSettings(next);
                    void saveConversationSettings(next);
                  }}
                />
              </div>

              <div className="rounded-md border border-border p-3">
                <div className="text-sm font-medium">Estilo da Resposta</div>
                <div className="mt-1 text-xs text-muted-foreground">Escolha o tom quando a automação estiver ativa.</div>
                <RadioGroup
                  className="mt-3 grid gap-2"
                  value={conversationSettings.replyTone}
                  onValueChange={(value) => {
                    const nextTone: 'humanized' | 'robotic' = value === 'robotic' ? 'robotic' : 'humanized';
                    const next = { ...conversationSettings, replyTone: nextTone };
                    setConversationSettings(next);
                    void saveConversationSettings(next);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="humanized" id="replyTone-humanized-central" disabled={settingsSaving} />
                    <Label htmlFor="replyTone-humanized-central">Humanizada</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="robotic" id="replyTone-robotic-central" disabled={settingsSaving} />
                    <Label htmlFor="replyTone-robotic-central">Robótica</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Serviços ativos</CardTitle>
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
