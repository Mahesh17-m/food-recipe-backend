class FallbackAIService {
    constructor() {
        console.log('✅ Fallback AI Service initialized');
    }

    async chat(message, context = {}) {
        console.log('🔄 Fallback AI handling:', message.substring(0, 50));
        
        return this.smartFallback(message, context);
    }

    smartFallback(message, context) {
        const lowerMsg = message.toLowerCase();
        const userName = context.userName || 'Friend';
        
        // Enhanced fallback responses
        const responses = {
            greeting: `Hi ${userName}! I'm your food assistant. I can help you find recipes, suggest meal plans, and answer cooking questions. What would you like to explore today?`,
            vegetarian: `Looking for vegetarian recipes, ${userName}? That's a great choice! Check out the Vegetarian category in our app for delicious options.`,
            recipeSearch: `I can help you find recipes! What ingredients do you have, or what type of cuisine are you interested in, ${userName}?`,
            cookingHelp: `Need cooking help, ${userName}? I can assist with techniques, substitutions, and cooking times. What specifically are you working on?`,
            mealPlan: `Meal planning is a great idea, ${userName}! I can suggest balanced meals based on your preferences and goals.`,
            default: `Hello ${userName}! I'm here to help with all things food. You can ask me about recipes, cooking tips, meal planning, or nutrition advice. What's on your mind?`
        };
        
        let response = responses.default;
        let needsData = false;
        
        if (lowerMsg.match(/hello|hi|hey|good morning|good afternoon/)) {
            response = responses.greeting;
        } else if (lowerMsg.includes('vegetarian') || lowerMsg.includes('vegan')) {
            response = responses.vegetarian;
            needsData = true;
        } else if (lowerMsg.includes('recipe') || lowerMsg.includes('cook') || lowerMsg.includes('make')) {
            response = responses.recipeSearch;
            needsData = true;
        } else if (lowerMsg.includes('how to') || lowerMsg.includes('cooking') || lowerMsg.includes('prepare')) {
            response = responses.cookingHelp;
        } else if (lowerMsg.includes('meal plan') || lowerMsg.includes('meal prep')) {
            response = responses.mealPlan;
            needsData = true;
        }
        
        return {
            text: response,
            needsData: needsData,
            isFallback: true
        };
    }
}

module.exports = new FallbackAIService();