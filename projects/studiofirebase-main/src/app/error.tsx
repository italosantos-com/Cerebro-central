"use client";

import { useEffect } from 'react';
import { buildClientPayload, logClientError } from '@/lib/error-logger';

export default function Error({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => {
        logClientError({
            ...buildClientPayload(error, 'app.error'),
            extra: error.digest ? { digest: error.digest } : undefined
        });
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md text-center space-y-3 p-6">
                <h1 className="text-xl font-semibold">Ocorreu um erro</h1>
                <p className="text-sm text-muted-foreground">
                    Se o problema continuar, atualize a pagina ou tente novamente.
                </p>
            </div>
        </div>
    );
}
