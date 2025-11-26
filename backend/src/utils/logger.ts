/**
 * Winston Logger Configuration
 * Centralized logging module for the Pharmaventory application
 * Provides structured logging with different levels for various workflows
 */

import winston from 'winston';

/**
 * Define log format with timestamp and metadata
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format for development (more readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

/**
 * Create and configure Winston logger instance
 * Logs to both console and file based on environment
 */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'pharmaventory-backend' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Log authentication workflow events
 * @param message - Log message
 * @param userId - User ID (optional)
 * @param metadata - Additional metadata
 */
export const logAuth = (message: string, userId?: string, metadata?: object) => {
  logger.info(message, { 
    workflow: 'authentication', 
    userId, 
    ...metadata 
  });
};

/**
 * Log inventory operations
 * @param message - Log message
 * @param medicineId - Medicine ID (optional)
 * @param metadata - Additional metadata
 */
export const logInventory = (message: string, medicineId?: string, metadata?: object) => {
  logger.info(message, { 
    workflow: 'inventory', 
    medicineId, 
    ...metadata 
  });
};

/**
 * Log prescription validation events
 * @param message - Log message
 * @param prescriptionId - Prescription ID (optional)
 * @param metadata - Additional metadata
 */
export const logPrescription = (message: string, prescriptionId?: string, metadata?: object) => {
  logger.info(message, { 
    workflow: 'prescription', 
    prescriptionId, 
    ...metadata 
  });
};

/**
 * Log chatbot interactions
 * @param message - Log message
 * @param query - User query (optional)
 * @param metadata - Additional metadata
 */
export const logChatbot = (message: string, query?: string, metadata?: object) => {
  logger.info(message, { 
    workflow: 'chatbot', 
    query, 
    ...metadata 
  });
};

/**
 * Log analytics and trend analysis
 * @param message - Log message
 * @param metadata - Additional metadata
 */
export const logAnalytics = (message: string, metadata?: object) => {
  logger.info(message, { 
    workflow: 'analytics', 
    ...metadata 
  });
};

/**
 * Log reordering module events
 * @param message - Log message
 * @param medicineId - Medicine ID (optional)
 * @param metadata - Additional metadata
 */
export const logReordering = (message: string, medicineId?: string, metadata?: object) => {
  logger.info(message, { 
    workflow: 'reordering', 
    medicineId, 
    ...metadata 
  });
};

/**
 * Log expiry alert events
 * @param message - Log message
 * @param medicineId - Medicine ID (optional)
 * @param metadata - Additional metadata
 */
export const logExpiry = (message: string, medicineId?: string, metadata?: object) => {
  logger.warn(message, { 
    workflow: 'expiry-alert', 
    medicineId, 
    ...metadata 
  });
};

/**
 * Export default logger instance
 */
export default logger;

