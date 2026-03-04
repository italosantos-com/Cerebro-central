"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Globe, Loader2 } from 'lucide-react';

export default function ChatTestPage() {
    const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
    const [translateLoading, setTranslateLoading] = useState<Record<string, boolean>>({});

    const handleTranslateMessage = async (messageId: string, text: string) => {
        if (translatedMessages[messageId]) {
            setTranslatedMessages(prev => {
                const newTranslations = { ...prev };
                delete newTranslations[messageId];
                return newTranslations;
            });
            return;
        }

        setTranslateLoading(prev => ({ ...prev, [messageId]: true }));
        try {
            const response = await fetch('/api/chat/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    targetLanguage: 'pt-BR'
                })
            });

            const data = await response.json();
            if (data.translatedText) {
                setTranslatedMessages(prev => ({
                    ...prev,
                    [messageId]: data.translatedText
                }));
            } else {
                console.error('Erro na tradução:', data);
            }
        } catch (error) {
            console.error('Erro ao traduzir mensagem:', error);
        } finally {
            setTranslateLoading(prev => ({ ...prev, [messageId]: false }));
        }
    };

    const testMessages = [
        {
            id: 'msg-1',
            text: '📍 Localização: -23.550520, -46.633309',
            isLocation: true,
            latitude: -23.550520,
            longitude: -46.633309
        },
        {
            id: 'msg-2',
            text: 'Hello, this is a test message',
            isLocation: false
        }
    ];

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>🧪 Chat Test - Translation Icon Debug</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Test 1: Location Message with Translation Button */}
                    <div>
                        <h3 className="font-semibold mb-3">Test 1: Location Message</h3>
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="max-w-[70%] rounded-lg p-3 bg-primary text-primary-foreground">
                                {testMessages[0].isLocation && testMessages[0].latitude && testMessages[0].longitude ? (
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`https://www.google.com/maps?q=${testMessages[0].latitude},${testMessages[0].longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 hover:underline"
                                        >
                                            <MapPin className="h-4 w-4" />
                                            {translatedMessages[testMessages[0].id] ? translatedMessages[testMessages[0].id] : testMessages[0].text}
                                        </a>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleTranslateMessage(testMessages[0].id, testMessages[0].text)}
                                            disabled={translateLoading[testMessages[0].id]}
                                            className="h-6 w-6 p-0"
                                            title={translatedMessages[testMessages[0].id] ? 'Remover tradução' : 'Traduzir'}
                                        >
                                            {translateLoading[testMessages[0].id] ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Globe className={`h-3 w-3 ${translatedMessages[testMessages[0].id] ? 'text-blue-500' : ''}`} />
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm whitespace-pre-wrap break-words">{testMessages[0].text}</p>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Status: {translatedMessages[testMessages[0].id] ? '✅ Translated' : '❌ Not Translated'}</p>
                    </div>

                    {/* Test 2: Regular Message */}
                    <div>
                        <h3 className="font-semibold mb-3">Test 2: Regular Message (No Translation)</h3>
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="max-w-[70%] rounded-lg p-3 bg-muted">
                                <p className="text-sm whitespace-pre-wrap break-words">{testMessages[1].text}</p>
                            </div>
                        </div>
                    </div>

                    {/* Debug Info */}
                    <div>
                        <h3 className="font-semibold mb-3">🔍 Debug Info</h3>
                        <div className="bg-slate-900 text-slate-100 p-3 rounded text-xs font-mono space-y-1">
                            <p>Globe Icon Imported: ✅ Yes</p>
                            <p>Translation States: {JSON.stringify(translatedMessages)}</p>
                            <p>Loading States: {JSON.stringify(translateLoading)}</p>
                            <p>Translation Button Active: {translatedMessages[testMessages[0].id] ? '✅ Yes' : '❌ No'}</p>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div>
                        <h3 className="font-semibold mb-3">📝 Test Steps</h3>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Verify the Globe icon appears next to the MapPin</li>
                            <li>Click the Globe button to toggle translation</li>
                            <li>Verify the Loader2 spinner appears while loading</li>
                            <li>Check if text changes to translated version</li>
                            <li>Verify button color changes to blue when translated</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
