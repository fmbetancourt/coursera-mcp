import winston from 'winston';
import fs from 'fs-extra';
import path from 'path';
import { sanitizeForLogging } from './logSanitizer';

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
    const sanitized = sanitizeForLogging({ timestamp, level, message, ...rest });
    return JSON.stringify(sanitized);
  })
);

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
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// MCP protocol requires stdout to carry only JSON-RPC messages.
// All log output must go to stderr so it never corrupts the MCP transport.
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export { logger };
