// Fallback-friendly logger that doesn't hard-depend on 'pino'.

// Removed invalid ambient module augmentation for 'pino' that caused a TS error.

// Safely require a module without breaking compilation when it's missing.
function safeRequire(name: string) {
    try {
        return require(name);
    } catch {
        return null;
    }
}

const isDev = process.env.NODE_ENV === 'development';
const pinoLib = safeRequire('pino');
const prettyTransport = isDev && (() => {
    try {
        require.resolve('pino-pretty');
        return { target: 'pino-pretty' };
    } catch {
        return undefined;
    }
})();

// Console-based fallback with the same interface we need.
const fallbackPino = () => ({
    info: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
});

// Build the logger using pino if available, otherwise the fallback.
export const logger = (pinoLib ?? fallbackPino)({
    level: isDev ? 'debug' : 'info',
    base: undefined,
    transport: prettyTransport,
});
