const axios = require('axios');

class HuggingFaceService {
    constructor() {
        this.apiToken = process.env.HF_API_TOKEN;
        this.model = process.env.HF_MODEL || 'microsoft/DialoGPT-small';
        this.baseUrl = 'https://api-inference.huggingface.co/models';
        this.timeout = 8000; // 8 seconds timeout
        
        // Food expert system prompt
        this.systemPrompt = `You are "Chef AI", a friendly food and cooking assistant for a recipe app.
        
USER CONTEXT:
- Name: {{userName}}
- Dietary preference: {{dietPreference}}
- Allergies: {{allergies}}

YOUR ROLE:
1. Help find recipes by ingredients, cuisine, diet, cooking time
2. Suggest meal plans for goals (weight loss, muscle gain, etc.)
3. Answer cooking questions (techniques, substitutions, measurements)
4. Provide nutrition tips
5. Be enthusiastic about food!

RESPONSE GUIDELINES:
- Keep responses conversational and under 3 sentences
- Ask clarifying questions if request is vague
- Never give medical advice
- Use the user's name: {{userName}}
- End with a question to keep conversation flowing

CURRENT TIME: {{currentTime}}`;
    }

    async chat(message, context = {}) {
        try {
            console.log('🤖 Hugging Face chat request:', { 
                messageLength: message.length,
                context: context.userName || 'unknown'
            });
            
            // Check if API token is set
            if (!this.apiToken) {
                console.log('⚠️ No HuggingFace API token found');
                return this.smartFallback(message, context);
            }
            
            // Build the prompt
            const prompt = this.buildPrompt(message, context);
            
            // Prepare API request with proper timeout handling
            const response = await this.makeAPIRequest(prompt);
            
            // Extract and clean response
            let aiText = this.extractResponse(response);
            aiText = this.cleanResponse(aiText);
            
            console.log('✅ Hugging Face response:', aiText.substring(0, 100) + '...');
            
            return {
                text: aiText,
                needsData: this.checkNeedsData(message, aiText),
                isFallback: false
            };
            
        } catch (error) {
            console.error('❌ HuggingFace chat error:', error.message);
            return this.smartFallback(message, context);
        }
    }

    async makeAPIRequest(prompt) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/${this.model}`,
                {
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 150,
                        temperature: 0.7,
                        top_p: 0.9,
                        do_sample: true,
                        return_full_text: false
                    },
                    options: {
                        use_cache: true,
                        wait_for_model: true
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.timeout
                }
            );
            
            return response.data;
        } catch (error) {
            // Handle specific HuggingFace errors
            if (error.response) {
                const status = error.response.status;
                if (status === 401 || status === 403) {
                    throw new Error('Invalid HuggingFace API token');
                } else if (status === 503) {
                    throw new Error('Model is loading, please try again in a few seconds');
                }
            }
            throw error;
        }
    }

    buildPrompt(message, context) {
        // Simple prompt without complex formatting
        let prompt = `You are a friendly food assistant. User: ${context.userName || 'Friend'}`;
        
        if (context.dietPreference && context.dietPreference !== 'None specified') {
            prompt += `\nDietary preference: ${context.dietPreference}`;
        }
        
        if (context.allergies && context.allergies.length > 0) {
            prompt += `\nAllergies: ${context.allergies.join(', ')}`;
        }
        
        prompt += `\n\nCurrent time: ${new Date().toLocaleTimeString()}`;
        prompt += `\n\nUser message: ${message}`;
        prompt += `\nAssistant response:`;
        
        return prompt;
    }

    extractResponse(data) {
        try {
            // Handle different response formats
            if (Array.isArray(data) && data.length > 0) {
                const firstItem = data[0];
                if (typeof firstItem === 'object' && firstItem.generated_text) {
                    return firstItem.generated_text;
                }
                return JSON.stringify(firstItem);
            }
            
            if (data && data.generated_text) {
                return data.generated_text;
            }
            
            if (typeof data === 'string') {
                return data;
            }
            
            // Try to extract from any nested structure
            const dataStr = JSON.stringify(data);
            const match = dataStr.match(/"generated_text":"([^"]+)"/);
            if (match) {
                return match[1];
            }
            
            return "I'm here to help with recipes! What would you like to know?";
            
        } catch (error) {
            console.log('Response extraction error:', error.message);
            return "Hello! I'm your food assistant. How can I help you today?";
        }
    }

    cleanResponse(text) {
        if (!text) return "How can I assist you with recipes today?";
        
        // Basic cleaning
        let cleanText = text
            .replace(/<\/?s>/g, '')
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/User:.*$/g, '')
            .replace(/Assistant:.*$/g, '')
            .trim();
        
        // Ensure it ends with proper punctuation
        if (cleanText && !/[.!?]$/.test(cleanText)) {
            cleanText += '.';
        }
        
        // Add some personality
        if (cleanText.length < 10) {
            cleanText = "That's interesting! Tell me more about what you're looking for.";
        }
        
        return cleanText || "Great question! I can help you with that.";
    }

    checkNeedsData(userMessage, aiText) {
        // Check if we should search for recipes
        const triggers = [
            /recipe/i,
            /suggest.*recipe/i,
            /find.*recipe/i,
            /looking.*for.*recipe/i,
            /what.*cook/i,
            /make.*with/i,
            /ingredient.*recipe/i,
            /meal.*idea/i
        ];
        
        return triggers.some(pattern => pattern.test(userMessage));
    }

    smartFallback(message, context) {
        const lowerMsg = message.toLowerCase();
        const userName = context.userName || 'Friend';
        
        // Context-aware responses
        if (lowerMsg.match(/hello|hi|hey|good morning|good afternoon/)) {
            return {
                text: `Hello ${userName}! I'm your food assistant. Ready to explore some delicious recipes?`,
                needsData: false,
                isFallback: true
            };
        } else if (lowerMsg.includes('recipe')) {
            return {
                text: `I can help you find recipes, ${userName}! What type of cuisine or ingredients are you interested in?`,
                needsData: true,
                isFallback: true
            };
        } else if (lowerMsg.includes('vegetarian') || lowerMsg.includes('vegan')) {
            return {
                text: `Looking for plant-based recipes? That's great, ${userName}! I can help you find delicious vegetarian options.`,
                needsData: true,
                isFallback: true
            };
        } else if (lowerMsg.includes('how to cook') || lowerMsg.includes('cooking tip')) {
            return {
                text: `I'd love to share cooking tips with you, ${userName}! What specifically would you like to learn?`,
                needsData: false,
                isFallback: true
            };
        }
        
        return {
            text: `Hi ${userName}! I can help you with recipes, meal plans, or cooking advice. What's on your mind today?`,
            needsData: false,
            isFallback: true
        };
    }
}

module.exports = new HuggingFaceService();