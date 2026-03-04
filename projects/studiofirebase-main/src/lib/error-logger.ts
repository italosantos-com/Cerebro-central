type ErrorPayload = {
    message: string;
    stack?: string;
    context?: string;
    source?: string;
    url?: string;
    line?: number;
    column?: number;
    extra?: Record<string, unknown>;
};

function serializeError(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
        return { message: error.message, stack: error.stack };
    }

    if (typeof error === 'string') {
        return { message: error };
    }

    try {
        return { message: JSON.stringify(error) };
    } catch {
        return { message: 'Unknown error' };
    }
}

export function logClientError(payload: ErrorPayload): void {
    const { message, stack, context, source, url, line, column, extra } = payload || ({} as ErrorPayload);
    const normalizedMessage = typeof message === 'string' && message.trim().length > 0
        ? message
        : 'Unknown error (no message provided)';

    const normalizedExtra = extra || (normalizedMessage === 'Unknown error (no message provided)'
        ? {
            payloadType: typeof payload,
            payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload as Record<string, unknown>) : [],
            timestamp: new Date().toISOString(),
        }
        : undefined);

    console.error('[AppError][Client]', {
        message: normalizedMessage,
        stack,
        context,
        source,
        url,
        line,
        column,
        extra: normalizedExtra
    });
}

export function logServerError(error: unknown, context?: string): void {
    const { message, stack } = serializeError(error);
    console.error('[AppError][Server]', {
        message,
        stack,
        context
    });
}

export function buildClientPayload(error: unknown, context?: string): ErrorPayload {
    const { message, stack } = serializeError(error);
    return {
        message,
        stack,
        context
    };
}
