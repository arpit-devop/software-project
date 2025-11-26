/**
 * Chatbot Controller
 * Handles AI-powered NLP chatbot requests
 */

import { Request, Response } from 'express';
import { processChatbotQuery } from '../services/chatbotService';
import logger, { logChatbot } from '../utils/logger';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';

/**
 * Process chatbot query
 * @param req - Express request object
 * @param res - Express response object
 */
export const chat = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Query is required',
      });
      return;
    }

    // Process query
    const response = await processChatbotQuery(query.trim());

    logChatbot('Chatbot response sent', query);

    res.status(200).json({
      success: true,
      data: {
        query,
        response,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error processing chatbot query:', {
      workflow: 'chatbot',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Error processing your query. Please try again.',
    });
  }
};

