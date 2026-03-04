"use client";

import { useEffect } from 'react';
import { buildClientPayload, logClientError, logServerError } from '@/lib/error-logger';

export default function GlobalError({
    error
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        logClientError({
            ...buildClientPayload(error, 'app.global-error'),
            extra: error.digest ? { digest: error.digest } : undefined
        });
    }, [error]);

    logServerError(error, 'app.global-error');

    return (
        <html lang="pt-BR">
            <body className="font-sans antialiased bg-background">
                <div className="min-h-screen flex items-center justify-center">
                    <div className="max-w-md text-center space-y-3 p-6">
                        <h1 className="text-xl font-semibold">Erro inesperado</h1>
                        <p className="text-sm text-muted-foreground">
                            Atualize a pagina para continuar.
                        </p>
                    </div>
                </div>
            </body>
        </html>
    );
}
