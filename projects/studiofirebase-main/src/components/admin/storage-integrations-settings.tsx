/**
 * Storage Integrations Settings Component
 * Configuração de integrações de armazenamento em nuvem
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Cloud,
    HardDrive,
    Youtube,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Settings
} from 'lucide-react';

interface IntegrationStatus {
    provider: 'google-drive' | 'google-one' | 'youtube' | 'icloud-drive';
    connected: boolean;
    lastSync?: string;
    quota?: {
        used: number;
        total: number;
        available: number;
    };
}

export default function StorageIntegrationsSettings() {
    const { toast } = useToast();
    const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
        { provider: 'google-drive', connected: false },
        { provider: 'google-one', connected: false },
        { provider: 'youtube', connected: false },
        { provider: 'icloud-drive', connected: false }
    ]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchIntegrationStatus();
    }, []);

    const fetchIntegrationStatus = async () => {
        try {
            const response = await fetch('/api/admin/integrations/status');
            const data = await response.json();

            if (data.success) {
                setIntegrations(data.integrations || integrations);
            }
        } catch (error) {
            console.error('Erro ao carregar status das integrações:', error);
        } finally {
            setLoading(false);
        }
    };

    const connectProvider = async (provider: string) => {
        try {
            setLoading(true);

            const response = await fetch(`/api/admin/integrations/${provider}/connect`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.authUrl) {
                window.location.href = data.authUrl;
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: 'Não foi possível iniciar autenticação'
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Falha ao conectar com o provedor'
            });
        } finally {
            setLoading(false);
        }
    };

    const disconnectProvider = async (provider: string) => {
        try {
            const response = await fetch(`/api/admin/integrations/${provider}/disconnect`, {
                method: 'POST'
            });

            if (response.ok) {
                toast({
                    title: 'Desconectado',
                    description: 'Integração removida com sucesso'
                });
                fetchIntegrationStatus();
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Falha ao desconectar'
            });
        }
    };

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'google-drive':
            case 'google-one':
                return <HardDrive className="w-6 h-6" />;
            case 'youtube':
                return <Youtube className="w-6 h-6" />;
            case 'icloud-drive':
                return <Cloud className="w-6 h-6" />;
            default:
                return <Settings className="w-6 h-6" />;
        }
    };

    const getProviderName = (provider: string) => {
        const names: Record<string, string> = {
            'google-drive': 'Google Drive',
            'google-one': 'Google One',
            'youtube': 'YouTube',
            'icloud-drive': 'iCloud Drive'
        };
        return names[provider] || provider;
    };

    const getProviderDescription = (provider: string) => {
        const descriptions: Record<string, string> = {
            'google-drive': 'Armazene arquivos gerais',
            'google-one': 'Backup de arquivos grandes',
            'youtube': 'Hospede vídeos',
            'icloud-drive': 'Galeria de fotos'
        };
        return descriptions[provider] || '';
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Integrações de Armazenamento</h2>
                <p className="text-muted-foreground">
                    Configure serviços de armazenamento em nuvem
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {integrations.map((integration) => (
                        <Card key={integration.provider}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {getProviderIcon(integration.provider)}
                                        <div>
                                            <CardTitle className="text-lg">{getProviderName(integration.provider)}</CardTitle>
                                            <CardDescription className="text-xs">
                                                {getProviderDescription(integration.provider)}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    {integration.connected ? (
                                        <Badge variant="default" className="flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Ativo
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Inativo
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3">
                                {integration.connected && integration.quota && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Uso</span>
                                            <span className="font-medium">
                                                {formatBytes(integration.quota.used)} / {formatBytes(integration.quota.total)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-secondary rounded-full h-1.5">
                                            <div
                                                className="bg-primary h-1.5 rounded-full"
                                                style={{
                                                    width: `${(integration.quota.used / integration.quota.total) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {integration.connected ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => disconnectProvider(integration.provider)}
                                                className="flex-1"
                                            >
                                                Desconectar
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => connectProvider(integration.provider)}
                                            className="w-full"
                                        >
                                            Conectar
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Uso Automático</CardTitle>
                    <CardDescription>
                        O sistema escolhe automaticamente o serviço ideal baseado no tipo de arquivo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• <strong>Vídeos:</strong> YouTube</li>
                        <li>• <strong>Fotos:</strong> iCloud Drive</li>
                        <li>• <strong>Arquivos:</strong> Google Drive/One</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
