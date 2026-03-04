import express from 'express';
import cors from 'cors';
import router from './routes';
import { loadConfig } from './config';
import { logger } from './logger';

const cfg = loadConfig();

const app = express();
app.disable('x-powered-by');
app.use(express.json());
// CORS for browser clients
const origins = cfg.allowedOrigins;
const matchOrigin = (origin: string, allow: string) => {
    if (allow === '*') return true;

    const patternToRegex = (pattern: string) => {
        const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        const regex = '^' + escaped.replace(/\*/g, '.*') + '$';
        return new RegExp(regex, 'i');
    };

    try {
        const url = new URL(origin);
        const originHost = url.hostname;

        if (allow.startsWith('http://') || allow.startsWith('https://')) {
            return patternToRegex(allow).test(origin);
        }

        return patternToRegex(allow).test(originHost);
    } catch {
        return false;
    }
};

app.use(cors({
    origin: origins === '*' ? true : (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = (origins as string[]).some((allow) => matchOrigin(origin, allow));
        if (allowed) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
    maxAge: 600,
}));
app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url, ip: req.ip }, 'request');
    next();
});
app.use('/', router);

const port = parseInt(cfg.PORT as string, 10) || 8080;
app.listen(port, () => {
    logger.info({ port }, 'SMS OTP backend listening');
});
