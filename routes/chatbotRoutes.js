const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const User = require('../models/User');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for chatbot endpoints
const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased to 100 requests per window for testing
    message: {
        success: false,
        error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

let aiService;
try {
    // Use YOUR filename: huggingFaceService.js
    aiService = require('../Services/huggingfaceService');
    console.log('✅ HuggingFace AI Service loaded');
} catch (error) {
    console.log('⚠️ HuggingFace service not found:', error.message);
    try {
        // Use YOUR filename: fallbackAIService.js
        aiService = require('../Services/fallbackAIService');
        console.log('✅ Fallback AI Service loaded');
    } catch (fallbackError) {
        console.log('❌ Both services failed, using basic fallback');
        aiService = {
            chat: async (message, context) => ({
                text: `Hi ${context.userName || 'Friend'}! I'm your food assistant. How can I help with recipes today?`,
                needsData: false
            })
        };
    }
}
// Apply rate limiting to all routes
router.use(chatLimiter);

// Helper function to clean text for voice
const cleanForVoice = (text) => {
    return text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .replace(/`/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\((.*?)\)/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

// ==================== PUBLIC ROUTES (No Auth) ====================

// Test endpoint (public)
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Food Assistant API is working',
        timestamp: new Date().toISOString(),
        aiProvider: aiService.constructor.name,
        features: [
            'POST /chat - Main chat endpoint (requires auth)',
            'POST /voice-chat - Voice chat (requires auth)',
            'POST /meal-plan - Generate meal plan (requires auth)',
            'POST /generate-recipe - Generate recipe from ingredients (requires auth)',
            'POST /command - Quick commands (requires auth)'
        ],
        status: 'active'
    });
});

// Status endpoint (public)
router.get('/status', (req, res) => {
    res.json({
        success: true,
        status: 'active',
        service: aiService.constructor.name.replace('Service', ' AI'),
        features: [
            'recipe recommendations',
            'meal planning',
            'cooking advice',
            'voice interaction',
            'personalized suggestions'
        ],
        endpoints: {
            public: ['GET /test', 'GET /status'],
            protected: ['POST /chat', 'POST /voice-chat', 'POST /meal-plan', 'POST /generate-recipe', 'POST /command']
        },
        timestamp: new Date().toISOString()
    });
});

// ==================== PROTECTED ROUTES (Require Auth) ====================

// Main chat endpoint (protected)
router.post('/chat', auth, async (req, res) => {
    try {
        const { message, voiceMode = false } = req.body;
        
        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log('💬 Chat request:', { 
            userId: req.userId, 
            message: message.substring(0, 100),
            voiceMode 
        });

        // Get user context from database
        const user = await User.findById(req.userId)
            .select('name username email dietPreferences savedRecipes favorites allergies')
            .populate('savedRecipes', 'title')
            .populate('favorites', 'title');

        const context = {
            userId: req.userId,
            userName: user.name || user.username || 'Friend',
            dietPreference: user.dietPreferences?.join(', ') || 'None specified',
            allergies: user.allergies || [],
            savedRecipes: user.savedRecipes?.map(r => r.title) || [],
            favorites: user.favorites?.map(r => r.title) || []
        };

        // Get AI response
        const aiResponse = await aiService.chat(message, context);
        
        // Check if response needs recipe data
        let recipes = [];
        let shouldSearchRecipes = aiResponse.needsData;
        
        if (shouldSearchRecipes) {
            recipes = await searchRecipesInDatabase(message, context);
            
            // If no recipes found with AI search, try simple search
            if (recipes.length === 0) {
                recipes = await simpleRecipeSearch(message);
            }
        }

        // Prepare response
        const response = {
            success: true,
            response: aiResponse.text,
            type: recipes.length > 0 ? 'recipes' : 'chat',
            timestamp: new Date().toISOString(),
            userContext: {
                name: context.userName,
                hasPreferences: context.dietPreference !== 'None specified',
                savedCount: context.savedRecipes.length,
                favoriteCount: context.favorites.length
            },
            aiProvider: aiService.constructor.name
        };

        // Add recipe suggestions if found
        if (recipes.length > 0) {
            response.suggestions = recipes.map(recipe => ({
                id: recipe._id,
                title: recipe.title,
                description: recipe.description ? recipe.description.substring(0, 100) + '...' : 'No description available',
                imageUrl: recipe.imageUrl || '/uploads/recipes/default-food.jpg',
                prepTime: recipe.prepTime || 15,
                cookTime: recipe.cookTime || 30,
                difficulty: recipe.difficulty || 'Medium',
                category: recipe.category || 'General',
                rating: recipe.rating || 0,
                author: recipe.author ? {
                    username: recipe.author.username,
                    profilePicture: recipe.author.profilePicture
                } : null
            }));
            
            // Enhance AI response if it doesn't mention recipes
            if (!aiResponse.text.includes('recipe') && !aiResponse.text.includes('found')) {
                response.response += `\n\nI found ${recipes.length} recipe(s) that might interest you!`;
            }
        }

        // If voice mode, add cleaned text
        if (voiceMode) {
            response.voiceText = cleanForVoice(aiResponse.text);
            response.shouldSpeak = true;
        }

        // Add fallback info if used
        if (aiResponse.isFallback) {
            response.aiNote = 'Using enhanced fallback responses';
        }

        console.log(`✅ Chat response ready. Type: ${response.type}, Recipes: ${recipes.length}`);
        res.json(response);

    } catch (error) {
        console.error('❌ Chat error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process chat request',
            fallbackResponse: "I'm having trouble connecting right now. Please try again or use the search feature.",
            timestamp: new Date().toISOString()
        });
    }
});

// Voice-specific endpoint (protected)
router.post('/voice-chat', auth, async (req, res) => {
    try {
        const { audioText, isVoiceOutput = true } = req.body;
        
        if (!audioText || audioText.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Voice text is required'
            });
        }

        console.log('🎤 Voice chat request:', { 
            userId: req.userId, 
            audioText: audioText.substring(0, 100) 
        });

        const user = await User.findById(req.userId)
            .select('name username');

        const context = {
            userId: req.userId,
            userName: user.name || user.username || 'Friend'
        };

        const aiResponse = await aiService.chat(audioText, context);
        
        // Clean response for voice output
        let voiceResponse = aiResponse.text;
        if (isVoiceOutput) {
            voiceResponse = cleanForVoice(aiResponse.text);
        }
        
        res.json({
            success: true,
            text: aiResponse.text,
            voiceText: voiceResponse,
            shouldSpeak: isVoiceOutput,
            timestamp: new Date().toISOString(),
            aiProvider: aiService.constructor.name
        });

    } catch (error) {
        console.error('❌ Voice chat error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to process voice request',
            voiceText: "Sorry, I'm having trouble understanding right now. Please try typing your question.",
            timestamp: new Date().toISOString()
        });
    }
});

// Generate meal plan endpoint (protected)
router.post('/meal-plan', auth, async (req, res) => {
    try {
        const { goal, diet, duration, cookingTime, servings, allergies } = req.body;
        const userId = req.userId;
        
        console.log('📅 Meal plan request:', { userId, goal, diet, duration });

        // Get user's dietary preferences
        const user = await User.findById(userId)
            .select('dietPreferences allergies name');
        
        // Build preferences object
        const preferences = {
            duration: duration || '7 days',
            goal: goal || 'healthy eating',
            diet: diet || user.dietPreferences?.[0] || 'balanced',
            budget: 'medium',
            cookingTime: cookingTime || '45',
            servings: servings || '2',
            allergies: allergies || user.allergies?.join(', ') || 'none',
            userName: user.name || user.username || 'Friend'
        };

        // Try to generate with AI, fallback to template
        let mealPlan;
        try {
            // This would call an AI meal plan generator
            // For now, use template
            mealPlan = generateMealPlanTemplate(preferences);
        } catch (aiError) {
            console.log('Using template meal plan');
            mealPlan = generateMealPlanTemplate(preferences);
        }

        res.json({
            success: true,
            mealPlan: mealPlan,
            message: 'Meal plan generated successfully',
            timestamp: new Date().toISOString(),
            preferences: preferences
        });

    } catch (error) {
        console.error('❌ Meal plan error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate meal plan',
            fallbackPlan: generateFallbackMealPlan(),
            timestamp: new Date().toISOString()
        });
    }
});

// Quick actions/commands (protected)
router.post('/command', auth, async (req, res) => {
    try {
        const { command, params = {} } = req.body;
        
        if (!command) {
            return res.status(400).json({
                success: false,
                error: 'Command is required'
            });
        }

        console.log('⚡ Command request:', { userId: req.userId, command, params });

        const user = await User.findById(req.userId)
            .select('name username savedRecipes favorites')
            .populate('savedRecipes', 'title')
            .populate('favorites', 'title');

        let response = '';
        let data = null;
        let action = null;

        switch (command.toLowerCase()) {
            case 'help':
                response = "I can help you with:\n• Finding recipes by ingredients or diet\n• Meal planning for goals (weight loss, muscle gain)\n• Cooking techniques and substitutions\n• Nutrition advice\n• Exploring your saved recipes\n\nTry asking me anything about food!";
                action = 'help_shown';
                break;
                
            case 'saved':
                const savedCount = user.savedRecipes?.length || 0;
                if (savedCount > 0) {
                    const savedTitles = user.savedRecipes.slice(0, 3).map(r => r.title);
                    response = `You have ${savedCount} saved recipes. Recent ones: ${savedTitles.join(', ')}`;
                    data = { recipes: user.savedRecipes.slice(0, 3) };
                } else {
                    response = "You haven't saved any recipes yet. When you find recipes you like, click the save button!";
                }
                action = 'saved_recipes';
                break;
                
            case 'favorites':
            case 'favourites':
                const favCount = user.favorites?.length || 0;
                if (favCount > 0) {
                    const favTitles = user.favorites.slice(0, 3).map(r => r.title);
                    response = `You have ${favCount} favorite recipes. Top ones: ${favTitles.join(', ')}`;
                    data = { recipes: user.favorites.slice(0, 3) };
                } else {
                    response = "You haven't added any favorites yet. Click the heart icon on recipes you love!";
                }
                action = 'favorite_recipes';
                break;
                
            case 'trending':
                // Get trending recipes (most viewed/liked)
                const trending = await Recipe.find({})
                    .select('title imageUrl rating category')
                    .sort({ rating: -1, createdAt: -1 })
                    .limit(3)
                    .lean();
                    
                data = { recipes: trending };
                response = "Here are some trending recipes right now:";
                action = 'trending_recipes';
                break;
                
            case 'quick':
            case 'quick meals':
                const quickRecipes = await Recipe.find({ 
                    $or: [
                        { cookTime: { $lte: 30 } },
                        { difficulty: 'Easy' }
                    ]
                })
                    .select('title cookTime difficulty category')
                    .limit(3)
                    .lean();
                    
                data = { recipes: quickRecipes };
                response = "Quick recipes (under 30 minutes or easy):";
                action = 'quick_recipes';
                break;
                
            case 'healthy':
                const healthyRecipes = await Recipe.find({ 
                    category: { $in: ['Vegetarian', 'Salad', 'Soup', 'Vegan'] } 
                })
                    .select('title category rating')
                    .limit(3)
                    .lean();
                    
                data = { recipes: healthyRecipes };
                response = "Healthy recipe suggestions:";
                action = 'healthy_recipes';
                break;
                
            case 'whats cooking':
            case 'inspiration':
                const randomRecipes = await Recipe.aggregate([
                    { $sample: { size: 2 } }
                ]);
                data = { recipes: randomRecipes };
                response = "Here are some recipe ideas to inspire you:";
                action = 'recipe_inspiration';
                break;
                
            default:
                response = `I don't recognize the command "${command}". Try: help, saved, favorites, trending, quick, healthy, or "whats cooking"`;
                action = 'unknown_command';
                break;
        }

        res.json({
            success: true,
            response: response,
            command: command,
            action: action,
            data: data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Command error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process command',
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

// Search recipes based on message content
async function searchRecipesInDatabase(message, context) {
    try {
        const lowerMsg = message.toLowerCase();
        let query = {};
        
        // Extract search terms from message
        if (lowerMsg.includes('vegetarian') || lowerMsg.includes('veggie')) {
            query.category = 'Vegetarian';
        } else if (lowerMsg.includes('vegan')) {
            query.category = 'Vegan';
        } else if (lowerMsg.includes('gluten')) {
            query.category = 'Gluten-Free';
        } else if (lowerMsg.includes('keto')) {
            query.category = 'Keto';
        }
        
        // Check for specific ingredients
        const commonIngredients = ['chicken', 'pasta', 'rice', 'potato', 'tomato', 'egg', 'cheese', 'fish'];
        for (const ingredient of commonIngredients) {
            if (lowerMsg.includes(ingredient)) {
                query.$or = [
                    { title: { $regex: ingredient, $options: 'i' } },
                    { 'ingredients.name': { $regex: ingredient, $options: 'i' } }
                ];
                break;
            }
        }
        
        // Check for meal types
        if (lowerMsg.includes('breakfast')) {
            query.category = 'Breakfast';
        } else if (lowerMsg.includes('lunch')) {
            query.category = 'Lunch';
        } else if (lowerMsg.includes('dinner') || lowerMsg.includes('supper')) {
            query.category = 'Dinner';
        } else if (lowerMsg.includes('dessert')) {
            query.category = 'Dessert';
        }
        
        // Check for cooking time
        if (lowerMsg.includes('quick') || lowerMsg.includes('fast') || lowerMsg.includes('easy')) {
            query.cookTime = { $lte: 30 };
            query.difficulty = 'Easy';
        }
        
        console.log('🔍 Recipe search query:', query);
        
        const recipes = await Recipe.find(query)
            .select('title description imageUrl prepTime cookTime difficulty category rating author')
            .populate('author', 'username profilePicture')
            .limit(5)
            .lean();
            
        return recipes;
        
    } catch (error) {
        console.error('Recipe search error:', error);
        return [];
    }
}

// Simple recipe search as fallback
async function simpleRecipeSearch(message) {
    try {
        const recipes = await Recipe.find({
            $or: [
                { title: { $regex: message.substring(0, 20), $options: 'i' } },
                { description: { $regex: message.substring(0, 20), $options: 'i' } }
            ]
        })
        .limit(3)
        .lean();
        
        return recipes;
    } catch (error) {
        return [];
    }
}

// Generate meal plan template
function generateMealPlanTemplate(preferences) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return {
        duration: preferences.duration,
        goal: preferences.goal,
        diet: preferences.diet,
        description: `A ${preferences.duration.toLowerCase()} ${preferences.diet} meal plan for ${preferences.goal}. Perfect for ${preferences.userName}!`,
        generatedFor: preferences.userName,
        generatedAt: new Date().toISOString(),
        days: days.slice(0, preferences.duration === '7 days' ? 7 : 3).map(day => ({
            day: day,
            meals: [
                {
                    meal: 'Breakfast',
                    name: `${preferences.diet} Breakfast`,
                    description: 'A balanced start to your day',
                    estimatedCalories: 350,
                    estimatedPrepTime: '15 min'
                },
                {
                    meal: 'Lunch',
                    name: `${preferences.diet} Lunch`,
                    description: 'Energizing midday meal',
                    estimatedCalories: 450,
                    estimatedPrepTime: '20 min'
                },
                {
                    meal: 'Dinner',
                    name: `${preferences.diet} Dinner`,
                    description: 'Satisfying evening meal',
                    estimatedCalories: 550,
                    estimatedPrepTime: `${preferences.cookingTime || 30} min`
                }
            ],
            totalCalories: 1350
        })),
        groceryList: [
            'Fresh vegetables (assorted)',
            'Lean protein source',
            'Whole grains',
            'Healthy fats',
            'Herbs and spices',
            preferences.diet === 'vegetarian' ? 'Plant-based protein' : 'Protein of choice'
        ],
        tips: [
            'Drink plenty of water throughout the day',
            'Prepare ingredients in advance to save time',
            'Listen to your hunger cues',
            'Add variety with different herbs and spices'
        ]
    };
}

// Fallback meal plan
function generateFallbackMealPlan() {
    return {
        duration: '7 days',
        goal: 'healthy eating',
        diet: 'balanced',
        description: 'A simple, balanced meal plan to get you started.',
        days: [],
        groceryList: ['Fresh vegetables', 'Lean protein', 'Whole grains', 'Healthy fats', 'Fruits'],
        tips: ['Stay hydrated', 'Eat mindfully', 'Include a variety of colors on your plate']
    };
}

module.exports = router;