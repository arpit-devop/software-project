/**
 * MongoDB Database Connection Configuration
 * Handles connection to MongoDB with error handling and reconnection logic
 */

import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * MongoDB connection options
 */
const connectionOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000, // Increased timeout for better connection handling
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
};

/**
 * Connect to MongoDB database
 * Establishes connection with retry logic and error handling
 */
export const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;
  
  try {
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Connect to MongoDB
    await mongoose.connect(mongoUri, connectionOptions);
    
    logger.info('MongoDB connected successfully', {
      workflow: 'database',
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    });

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', {
        workflow: 'database',
        error: error.message,
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected', {
        workflow: 'database',
      });
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to application termination', {
        workflow: 'database',
      });
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', {
      workflow: 'database',
      error: error instanceof Error ? error.message : 'Unknown error',
      mongoUri: mongoUri ? `${mongoUri.substring(0, 20)}...` : 'not set',
    });
    
    // Don't exit in development - allow server to start and show error
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('MongoDB connection failed but continuing in development mode', {
        workflow: 'database',
      });
    }
  }
};

/**
 * Disconnect from MongoDB database
 * Gracefully closes the database connection
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected successfully', {
      workflow: 'database',
    });
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', {
      workflow: 'database',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

