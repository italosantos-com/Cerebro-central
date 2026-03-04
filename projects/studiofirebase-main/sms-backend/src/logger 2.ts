// Lightweight logger that prefers pino when available but gracefully falls back to console.

type LoggerImpl = {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
};

type LoggerFactory = (options?: Record<string, any>) => LoggerImpl;

function safeRequire(name: string): LoggerFactory | null {
  try {
    return require(name);
  } catch {
    return null;
  }
}

const isDev = process.env.NODE_ENV === 'development';
const pinoFactory = safeRequire('pino');

const prettyTransport = isDev
  ? (() => {
      try {
        require.resolve('pino-pretty');
        return { target: 'pino-pretty' };
      } catch {
        return undefined;
      }
    })()
  : undefined;

const fallbackLogger: LoggerFactory = () => ({
  info: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
});

const factory = pinoFactory ?? fallbackLogger;

export const logger: LoggerImpl = factory({
  level: isDev ? 'debug' : 'info',
  base: undefined,
  transport: prettyTransport,
});
