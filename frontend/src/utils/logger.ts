/**
 * Frontend Logger Utility
 * 
 * Replaces console.log/error/warn with production-safe logging.
 * Only logs to console in development mode.
 */

const isDevelopment = import.meta.env.MODE === 'development';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Logger interface
 */
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown, ...args: unknown[]): void;
}

/**
 * Format log message with timestamp
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Safe error serialization
 * Extracts message, stack, and status code without exposing sensitive data
 */
function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      // Don't log full stack in production
      stack: isDevelopment ? error.stack : undefined,
    };
  }
  
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    return {
      message: err.message || 'Unknown error',
      status: err.status,
      // Don't expose sensitive data
      ...(isDevelopment ? err : {}),
    };
  }
  
  return {
    message: String(error),
  };
}

/**
 * Logger implementation
 */
const logger: Logger = {
  debug(message: string, ...args: unknown[]) {
    if (isDevelopment) {
      console.debug(formatMessage(LogLevel.DEBUG, message), ...args);
    }
  },

  info(message: string, ...args: unknown[]) {
    if (isDevelopment) {
      console.info(formatMessage(LogLevel.INFO, message), ...args);
    }
  },

  warn(message: string, ...args: unknown[]) {
    if (isDevelopment) {
      console.warn(formatMessage(LogLevel.WARN, message), ...args);
    }
  },

  error(message: string, error?: Error | unknown, ...args: unknown[]) {
    // Always log errors (even in production) but sanitize them
    const serializedError = error ? serializeError(error) : undefined;
    
    if (isDevelopment) {
      console.error(formatMessage(LogLevel.ERROR, message), serializedError, ...args);
    } else {
      // In production, only log the message and sanitized error
      console.error(formatMessage(LogLevel.ERROR, message), serializedError);
    }
  },
};

export default logger;
