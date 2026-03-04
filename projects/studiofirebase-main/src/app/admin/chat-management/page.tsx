"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquare, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ChatManagementPage() {
    const { toast } = useToast();
    const [isCleaningUp, setIsCleaningUp] = useState(false);
    const [lastCleanupResult, setLastCleanupResult] = useState<{
        messagesDeleted: number;
        chatsDeleted: number;
        timestamp: string;
    } | null>(null);

    const handleCleanup = async () => {
        if (!confirm('⚠️  ATENÇÃO: Esta ação irá remover TODOS os chats secretos e suas mensagens permanentemente!\n\nEsta ação não pode ser desfeita. Deseja continuar?')) {
            return;
        }

        setIsCleaningUp(true);
        
        try {
            const response = await fetch('/api/chat-cleanup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer cleanup-secret-2025-token'
                }
            });

            const result = await response.json();

            if (response.ok) {
                setLastCleanupResult({
                    messagesDeleted: result.messagesDeleted,
                    chatsDeleted: result.chatsDeleted,
                    timestamp: result.timestamp
                });
                
                toast({
                    title: "Limpeza Completa Concluída",
                    description: `TODOS os chats foram removidos: ${result.chatsDeleted} chats e ${result.messagesDeleted} mensagens.`
                });
            } else {
                throw new Error(result.message || 'Erro na limpeza');
            }
        } catch (error: any) {
    
            toast({
                variant: 'destructive',
                title: "Erro na Limpeza",
                description: error.message || 'Não foi possível executar a limpeza.'
            });
        } finally {
            setIsCleaningUp(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Gerenciamento de Chat</h1>
                <p className="text-muted-foreground">
                    Limpeza completa do sistema de chat secreto - Remove todos os chats e mensagens.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Informações sobre o Sistema */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Como Funciona
                        </CardTitle>
                        <CardDescription>
                            Sistema de mensagens temporárias vs permanentes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="font-medium">Mensagens Temporárias</span>
                            </div>
                            <p className="text-sm text-muted-foreground ml-5">
                                Mensagens dos usuários são temporárias e são automaticamente removidas após um período.
                                Cada sessão do usuário cria um novo chat temporário.
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="font-medium">Mensagens Permanentes</span>
                            </div>
                            <p className="text-sm text-muted-foreground ml-5">
                                Mensagens dos administradores são permanentes e ficam salvas indefinidamente
                                para referência futura.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Limpeza Manual Completa */}
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Limpeza Manual Completa
                        </CardTitle>
                        <CardDescription>
                            ⚠️  Remove TODOS os chats secretos e mensagens permanentemente
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert className="border-orange-200 bg-orange-50">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-800">Atenção!</AlertTitle>
                            <AlertDescription className="text-orange-700">
                                Esta função remove <strong>TODOS</strong> os chats secretos do sistema, incluindo todas as mensagens.
                                Esta ação é <strong>irreversível</strong>!
                            </AlertDescription>
                        </Alert>

                        <Button 
                            onClick={handleCleanup} 
                            disabled={isCleaningUp}
                            variant="destructive"
                            className="w-full"
                        >
                            {isCleaningUp ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Executando Limpeza Completa...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Executar Limpeza Completa
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Resultado da Última Limpeza */}
            {lastCleanupResult && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Última Limpeza Completa Executada</AlertTitle>
                    <AlertDescription>
                        <div className="mt-2 space-y-1">
                            <p><strong>Data:</strong> {new Date(lastCleanupResult.timestamp).toLocaleString('pt-BR')}</p>
                            <p><strong>Chats removidos:</strong> {lastCleanupResult.chatsDeleted}</p>
                            <p><strong>Mensagens removidas:</strong> {lastCleanupResult.messagesDeleted}</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                ✅ Todos os chats secretos foram removidos completamente
                            </p>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Instruções Importantes */}
            <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">⚠️  Importante - Limpeza Completa</AlertTitle>
                <AlertDescription className="text-red-700">
                    <ul className="mt-2 space-y-1 text-sm">
                        <li>• <strong>Remove TODOS os chats secretos</strong> do sistema</li>
                        <li>• <strong>Remove TODAS as mensagens</strong> (usuários e admin)</li>
                        <li>• Esta ação é <strong>permanente e irreversível</strong></li>
                        <li>• Use apenas quando quiser limpar completamente o sistema</li>
                        <li>• Uma confirmação será solicitada antes da execução</li>
                    </ul>
                </AlertDescription>
            </Alert>
        </div>
    );
}
