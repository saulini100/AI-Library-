type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
}

class Logger {
  private isDevelopment: boolean;
  private logLevel: LogLevel;
  private context?: string;

  constructor(context?: string) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      data,
    };
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const prefix = this.context ? `[${this.context}]` : '';
    const timestamp = this.isDevelopment ? entry.timestamp.split('T')[1].split('.')[0] : '';
    
    let logMethod: 'log' | 'warn' | 'error' = 'log';
    let emoji = '';
    
    switch (entry.level) {
      case 'debug':
        emoji = '🔍';
        break;
      case 'info':
        emoji = '🔵';
        break;
      case 'warn':
        emoji = '🟡';
        logMethod = 'warn';
        break;
      case 'error':
        emoji = '🔴';
        logMethod = 'error';
        break;
    }

    const formattedMessage = `${emoji} ${timestamp} ${prefix} ${entry.message}`;
    
    if (entry.data) {
      console[logMethod](formattedMessage, entry.data);
    } else {
      console[logMethod](formattedMessage);
    }
  }

  debug(message: string, data?: any): void {
    this.output(this.formatMessage('debug', message, data));
  }

  info(message: string, data?: any): void {
    this.output(this.formatMessage('info', message, data));
  }

  warn(message: string, data?: any): void {
    this.output(this.formatMessage('warn', message, data));
  }

  error(message: string, error?: any): void {
    this.output(this.formatMessage('error', message, error));
  }

  // Convenience methods for common scenarios
  apiCall(method: string, url: string, data?: any): void {
    this.debug(`API ${method.toUpperCase()} ${url}`, data);
  }

  performance(operation: string, duration: number): void {
    this.info(`⏱️ ${operation} completed in ${duration}ms`);
  }

  userAction(action: string, data?: any): void {
    this.info(`👤 User action: ${action}`, data);
  }

  aiResponse(model: string, duration: number, tokens?: number): void {
    const tokenInfo = tokens ? ` (${tokens} tokens)` : '';
    this.info(`🤖 AI response from ${model} in ${duration}ms${tokenInfo}`);
  }

  database(operation: string, table?: string, duration?: number): void {
    const tableInfo = table ? ` on ${table}` : '';
    const durationInfo = duration ? ` in ${duration}ms` : '';
    this.debug(`🗄️ Database ${operation}${tableInfo}${durationInfo}`);
  }

  websocket(event: string, data?: any): void {
    this.debug(`🔌 WebSocket ${event}`, data);
  }

  fileOperation(operation: string, filename: string, size?: number): void {
    const sizeInfo = size ? ` (${this.formatFileSize(size)})` : '';
    this.info(`📁 File ${operation}: ${filename}${sizeInfo}`);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Create a child logger with additional context
  child(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context;
    return new Logger(childContext);
  }
}

// Create default logger instance
export const logger = new Logger();

// Create context-specific loggers
export const createLogger = (context: string): Logger => new Logger(context);

// Export commonly used loggers
export const apiLogger = createLogger('API');
export const aiLogger = createLogger('AI');
export const dbLogger = createLogger('DB');
export const wsLogger = createLogger('WS');
export const authLogger = createLogger('AUTH');
export const fileLogger = createLogger('FILE');

// Utility function to time operations
export function timeOperation<T>(
  operation: () => T | Promise<T>,
  operationName: string,
  log: Logger = logger
): T | Promise<T> {
  const start = Date.now();
  
  try {
    const result = operation();
    
    if (result instanceof Promise) {
      return result.then(
        (value) => {
          log.performance(operationName, Date.now() - start);
          return value;
        },
        (error) => {
          log.error(`${operationName} failed after ${Date.now() - start}ms`, error);
          throw error;
        }
      );
    } else {
      log.performance(operationName, Date.now() - start);
      return result;
    }
  } catch (error) {
    log.error(`${operationName} failed after ${Date.now() - start}ms`, error);
    throw error;
  }
} 