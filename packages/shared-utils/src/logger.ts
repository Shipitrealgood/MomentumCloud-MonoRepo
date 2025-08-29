import { createRequire } from 'module';

// This forces the use of the stable CommonJS require mechanism for pino, bypassing the ESM import issue.
const require = createRequire(import.meta.url);
const pino = require('pino');

// List of keys to redact from logs
const redactKeys = [
    '*.SALESFORCE_CLIENT_ID',
    '*.SALESFORCE_CLIENT_SECRET',
    '*.SALESFORCE_CALLBACK_URL',
    '*.SALESFORCE_LOGIN_URL',
    '*.EASE_EMAIL',
    '*.EASE_PASSWORD',
    '*.EASE_2FA_SECRET',
    '*.SALESFORCE_ACCESS_TOKEN',
    '*.SALESFORCE_INSTANCE_URL',
    'email',
    'personalEmail',
    'phone',
    'birthdate',
    'ssn',
    'password',
    'secret',
    'token',
    'accessToken',
    'refreshToken',
];

export const logger = pino({
    level: 'info', // Default log level
    redact: {
        paths: redactKeys,
        censor: '[Redacted]',
    },
    transport: {
        // Use pino-pretty for human-readable logs in development, and default JSON in production
        target: process.env.NODE_ENV !== 'production' ? 'pino-pretty' : 'pino/file',
        options: {
            colorize: true,
            ignore: 'pid,hostname',
        },
    },
});