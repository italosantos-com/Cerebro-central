"use client";

import { useEffect } from 'react';
import { buildClientPayload, logClientError } from '@/lib/error-logger';

export default function ErrorReporter() {
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            if (!event) return;

            const payload = buildClientPayload(event.error || event.message, 'window.error');
            logClientError({
                ...payload,
                source: event.filename,
                url: event.filename,
                line: event.lineno,
                column: event.colno
            });
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message: string = reason?.message || (typeof reason === 'string' ? reason : '');

            // Ignorar erros de rede esperados no WebKit/Safari ("Load failed" / "Failed to fetch")
            if (message === 'Load failed' || message === 'Failed to fetch') {
                return;
            }

            // Ignorar erros internos de transporte do Firestore (reconexão automática)
            if (message && (message.includes('WebChannelConnection') || message.includes('transport errored'))) {
                return;
            }

            const payload = buildClientPayload(event.reason, 'window.unhandledrejection');
            logClientError(payload);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    return null;
}
