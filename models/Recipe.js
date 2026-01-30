const mongoose = require('mongoose');

if (mongoose.models.Recipe) {
  module.exports = mongoose.model('Recipe');
} else {
  const ingredientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: String, required: true }
  });

  const instructionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    imageUrl: { type: String }
  });

  const nutritionSchema = new mongoose.Schema({
    calories: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    fat: { type: Number, default: 0 }
  });

  const recipeSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    ingredients: [ingredientSchema],
    instructions: [instructionSchema],
    prepTime: { type: Number, required: true, min: 0 },
    cookTime: { type: Number, required: true, min: 0 },
    servings: { type: Number, required: true, min: 1 },
    difficulty: { 
      type: String, 
      required: true, 
      enum: ['Easy', 'Medium', 'Hard'] 
    },
    category: { 
      type: String, 
      required: true,
      enum: ['Breakfast', 'Lunch', 'Dinner', 'Desserts', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Ketos','Non-Vegetarian','Snacks' ,'Salads','Soups','Juices']
    },
    imageUrl: { type: String },
    author: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    nutrition: nutritionSchema,
    notes: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  recipeSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
  });

  module.exports = mongoose.model('Recipe', recipeSchema);
}