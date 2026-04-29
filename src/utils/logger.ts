import winston from 'winston';
import fs from 'fs-extra';
import path from 'path';
import { createSanitizer } from './logSanitizer';

const logsDir = path.join(process.env.HOME || '~', '.coursera-mcp');

function ensureLogsDirectory(): void {
  fs.ensureDirSync(logsDir);
}

ensureLogsDirectory();

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...rest }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...rest,
    });
  })
);

const sanitizer = createSanitizer();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'coursera-mcp' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format((info) => sanitizer(info as Record<string, unknown>)),
        logFormat
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format((info) => sanitizer(info as Record<string, unknown>)),
        logFormat
      ),
    }),
  ],
});

// In development, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export { logger };
