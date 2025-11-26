/**
 * Main Server File
 * Express server setup with all routes, middleware, and scheduled tasks
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import logger from './utils/logger';
import cron from 'node-cron';
import { checkAndCreateReorderRequests } from './services/reorderService';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import routes
import authRoutes from './routes/authRoutes';
import medicineRoutes from './routes/medicineRoutes';
import prescriptionRoutes from './routes/prescriptionRoutes';
import reorderRoutes from './routes/reorderRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import chatbotRoutes from './routes/chatbotRoutes';

// Load environment variables
dotenv.config();

/**
 * Create Express application
 */
const app: Application = express();
const httpServer = createServer(app);

/**
 * Initialize Socket.IO for real-time updates
 */
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

/**
 * Middleware
 */

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    workflow: 'http',
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Pharmaventory API is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/reorders', reorderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chatbot', chatbotRoutes);

/**
 * Socket.IO connection handling for real-time updates
 */
io.on('connection', (socket) => {
  logger.info('Client connected to Socket.IO', {
    workflow: 'socket',
    socketId: socket.id,
  });

  // Join room for inventory updates
  socket.on('join-inventory', () => {
    socket.join('inventory');
    logger.info('Client joined inventory room', {
      workflow: 'socket',
      socketId: socket.id,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info('Client disconnected from Socket.IO', {
      workflow: 'socket',
      socketId: socket.id,
    });
  });
});

/**
 * Export Socket.IO instance for use in other modules
 */
export const getIO = () => io;

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/**
 * Error handling middleware
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    workflow: 'http',
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

/**
 * Scheduled Tasks
 */

// Run automated reorder check every 6 hours
cron.schedule('0 */6 * * *', async () => {
  logger.info('Running scheduled automated reorder check', {
    workflow: 'scheduler',
  });
  await checkAndCreateReorderRequests();
});

// Run automated reorder check daily at midnight
cron.schedule('0 0 * * *', async () => {
  logger.info('Running daily automated reorder check', {
    workflow: 'scheduler',
  });
  await checkAndCreateReorderRequests();
});

/**
 * Start server
 */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Pharmaventory server is running on port ${PORT}`, {
        workflow: 'server',
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', {
      workflow: 'server',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled promise rejection:', {
    workflow: 'server',
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception:', {
    workflow: 'server',
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

