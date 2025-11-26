/**
 * Chatbot Routes
 * Defines API endpoints for AI-powered NLP chatbot
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { chat } from '../controllers/chatbotController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Validation rules for chatbot query
 */
const chatValidation = [
  body('query')
    .trim()
    .notEmpty()
    .withMessage('Query is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Query must be between 1 and 500 characters'),
];

/**
 * POST /api/chatbot/chat
 * Process chatbot query
 */
router.post('/chat', authenticate, chatValidation, chat);

export default router;

