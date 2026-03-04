'use client';

import { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class SubscriptionsErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        console.error('[Error Boundary] Erro capturado:', error);
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('[Error Boundary] Detalhes do erro:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="container mx-auto py-10">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                                <CardTitle>Erro ao carregar página</CardTitle>
                            </div>
                            <CardDescription>
                                Ocorreu um erro ao tentar carregar a página de assinaturas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-muted rounded-md">
                                <p className="text-sm font-mono text-muted-foreground">
                                    {this.state.error?.message || 'Erro desconhecido'}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="flex items-center gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Recarregar página
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => window.history.back()}
                                >
                                    Voltar
                                </Button>
                            </div>

                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    Se o problema persistir, entre em contato com o suporte técnico.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
