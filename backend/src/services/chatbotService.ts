/**
 * Chatbot Service
 * AI-powered NLP chatbot for medicine queries with <2s response time
 * Uses OpenRouter API for AI model access
 */

import OpenAI from 'openai';
import { Medicine } from '../models/Medicine';
import logger, { logChatbot } from '../utils/logger';

/**
 * Initialize OpenRouter client (compatible with OpenAI SDK)
 * OpenRouter provides access to multiple AI models through a unified API
 */
const openai = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://pharmaventory.com',
        'X-Title': 'Pharmaventory',
      },
    })
  : null;

/**
 * Search medicines in database - Enhanced with multiple search strategies
 * @param query - Search query string
 * @returns Array of matching medicines
 */
const searchMedicines = async (query: string) => {
  try {
    const searchTerm = query.trim().toLowerCase();
    
    // Try text search first (if index exists)
    let medicines: any[] = [];
    
    try {
      medicines = await Medicine.find({
        $text: { $search: searchTerm },
        isActive: true,
      })
        .limit(10)
        .select('name genericName brandName category quantity expiryDate pricePerUnit unit')
        .lean();
    } catch (textSearchError) {
      // Text index might not exist, fall back to regex search
      logger.warn('Text search failed, using regex fallback', {
        workflow: 'chatbot',
        error: textSearchError instanceof Error ? textSearchError.message : 'Unknown error',
      });
    }

    // If text search returned no results or failed, use regex search
    if (medicines.length === 0) {
      medicines = await Medicine.find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { genericName: { $regex: searchTerm, $options: 'i' } },
          { brandName: { $regex: searchTerm, $options: 'i' } },
          { category: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
        isActive: true,
      })
        .limit(10)
        .select('name genericName brandName category quantity expiryDate pricePerUnit unit')
        .lean();
    }

    // If still no results, try partial word matching
    if (medicines.length === 0 && searchTerm.length > 2) {
      const words = searchTerm.split(' ').filter(w => w.length > 2);
      if (words.length > 0) {
        medicines = await Medicine.find({
          $or: words.map(word => ({
            $or: [
              { name: { $regex: word, $options: 'i' } },
              { genericName: { $regex: word, $options: 'i' } },
              { brandName: { $regex: word, $options: 'i' } },
            ],
          })),
          isActive: true,
        })
          .limit(10)
          .select('name genericName brandName category quantity expiryDate pricePerUnit unit')
          .lean();
      }
    }

    logChatbot('Medicine search completed', query, {
      medicinesFound: medicines.length,
      searchTerm,
    });

    return medicines;
  } catch (error) {
    logger.error('Error searching medicines:', {
      workflow: 'chatbot',
      error: error instanceof Error ? error.message : 'Unknown error',
      query,
    });
    return [];
  }
};

/**
 * Get medicine alternatives
 * @param medicineName - Name of the medicine
 * @returns Array of alternative medicines in same category
 */
const getAlternatives = async (medicineName: string) => {
  try {
    // Find the medicine first
    const medicine = await Medicine.findOne({
      $or: [
        { name: { $regex: medicineName, $options: 'i' } },
        { genericName: { $regex: medicineName, $options: 'i' } },
        { brandName: { $regex: medicineName, $options: 'i' } },
      ],
      isActive: true,
    }).lean();

    if (!medicine) {
      return [];
    }

    // Find alternatives in same category
    const alternatives = await Medicine.find({
      category: medicine.category,
      _id: { $ne: medicine._id },
      isActive: true,
      quantity: { $gt: 0 },
    })
      .limit(5)
      .select('name genericName brandName pricePerUnit')
      .lean();

    return alternatives;
  } catch (error) {
    logger.error('Error finding alternatives:', {
      workflow: 'chatbot',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
};

/**
 * Process chatbot query using AI
 * @param query - User query
 * @returns AI-generated response
 */
export const processChatbotQuery = async (query: string): Promise<string> => {
  const startTime = Date.now();

  try {
    logChatbot('Processing chatbot query', query);

    // Search medicines based on query
    const medicines = await searchMedicines(query);
    const alternatives = await getAlternatives(query);

    // Build context for AI
    let context = 'You are a helpful pharmaceutical inventory assistant. ';
    context += 'Answer questions about medicine availability, alternatives, and usage. ';
    context += 'Be concise and accurate. Response time must be under 2 seconds.\n\n';

    if (medicines.length > 0) {
      context += 'Available medicines matching the query:\n';
      medicines.forEach((med) => {
        const expiryDate = new Date(med.expiryDate);
        const isExpired = expiryDate < new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        context += `- ${med.name} (${med.genericName}): Stock: ${med.quantity} ${med.unit || 'units'}, `;
        context += `Price: ₹${med.pricePerUnit.toFixed(2)}, `;
        context += isExpired 
          ? 'EXPIRED\n' 
          : `Expires in ${daysUntilExpiry} days\n`;
      });
    }

    if (alternatives.length > 0) {
      context += '\nAlternative medicines:\n';
      alternatives.forEach((alt) => {
        context += `- ${alt.name} (${alt.genericName}): ₹${alt.pricePerUnit.toFixed(2)}\n`;
      });
    }

    if (medicines.length === 0 && alternatives.length === 0) {
      context += 'No medicines found matching the query.';
    }

    // Use OpenRouter for natural language response
    // Fallback to simple response if API key is not available
    if (!openai || !process.env.OPENROUTER_API_KEY) {
      logChatbot('OpenRouter API key not configured, using fallback response', query);
      
      if (medicines.length > 0) {
        const med = medicines[0];
        const expiryDate = new Date(med.expiryDate);
        const isExpired = expiryDate < new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        let response = `I found ${medicines.length} medicine(s) matching "${query}".\n\n`;
        response += `**${med.name}** (${med.genericName})\n`;
        response += `• Stock: ${med.quantity} ${med.unit || 'units'}\n`;
        response += `• Price: ₹${med.pricePerUnit.toFixed(2)} per unit\n`;
        response += isExpired 
          ? `• Status: ⚠️ EXPIRED\n`
          : `• Expires: ${daysUntilExpiry} days\n`;
        
        if (medicines.length > 1) {
          response += `\nOther matches: ${medicines.slice(1, 4).map(m => m.name).join(', ')}`;
        }
        
        return response;
      } else if (alternatives.length > 0) {
        return `I couldn't find an exact match for "${query}", but here are some alternatives in the same category:\n${alternatives.map(a => `• ${a.name} (${a.genericName}) - ₹${a.pricePerUnit.toFixed(2)}`).join('\n')}`;
      } else {
        // Try to get some sample medicines to suggest
        const sampleMedicines = await Medicine.find({ isActive: true })
          .limit(5)
          .select('name category')
          .lean();
        
        if (sampleMedicines.length > 0) {
          return `I couldn't find any medicines matching "${query}".\n\nHere are some available categories: ${[...new Set(sampleMedicines.map(m => m.category))].join(', ')}.\n\nTry searching by medicine name, category, or contact the pharmacy staff for assistance.`;
        }
        
        return `I couldn't find any medicines matching "${query}". Please try a different search term, check the available categories, or contact the pharmacy staff for assistance.`;
      }
    }

    // Call OpenRouter API (compatible with OpenAI SDK)
    // TypeScript assertion: we know openai is not null here due to the check above
    const completion = await openai!.chat.completions.create({
      model: 'openai/gpt-3.5-turbo', // OpenRouter model format
      messages: [
        {
          role: 'system',
          content: context,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not process your query at this time.';

    const responseTime = Date.now() - startTime;
    logChatbot('Chatbot query processed', query, {
      responseTime: `${responseTime}ms`,
      medicinesFound: medicines.length,
      alternativesFound: alternatives.length,
    });

    // Ensure response time is under 2 seconds
    if (responseTime > 2000) {
      logger.warn('Chatbot response time exceeded 2 seconds', {
        workflow: 'chatbot',
        responseTime,
      });
    }

    return response;
  } catch (error) {
    logger.error('Error processing chatbot query:', {
      workflow: 'chatbot',
      error: error instanceof Error ? error.message : 'Unknown error',
      query,
    });

    // Fallback response
    const medicines = await searchMedicines(query);
    if (medicines.length > 0) {
      const med = medicines[0];
      return `I found ${medicines.length} medicine(s). ${med.name} is available with ${med.quantity} units in stock.`;
    }

    return "I apologize, but I encountered an error processing your query. Please try rephrasing your question or contact the pharmacy staff for assistance.";
  }
};

