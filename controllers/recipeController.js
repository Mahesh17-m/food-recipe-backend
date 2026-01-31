const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const User = require('../models/User');
const Review = require('../models/Review');
const { calculateAverageRating } = require('../Services/recipeService');
const notificationController = require('./notificationController');

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
const parseArrayData = (data) => Array.isArray(data) ? data : JSON.parse(data);

exports.createRecipe = async (req, res) => {
  try {
    console.log('📝 Creating recipe with Cloudinary...');
    console.log('📸 Uploaded file:', req.file ? req.file.path : 'No file');
    console.log('📦 Request body:', req.body);

    let recipeData;
    if (req.body.data) {
      recipeData = JSON.parse(req.body.data);
    } else if (typeof req.body === 'string') {
      recipeData = JSON.parse(req.body);
    } else {
      recipeData = req.body;
    }

    const requiredFields = ['title', 'description', 'prepTime', 'cookTime', 'servings', 'difficulty', 'category'];
    const missingFields = requiredFields.filter(field => !recipeData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}`,
        code: 'MISSING_FIELDS'
      });
    }

    let ingredients = [];
    let instructions = [];
    try {
      ingredients = typeof recipeData.ingredients === 'string' 
        ? JSON.parse(recipeData.ingredients) 
        : recipeData.ingredients;
      
      instructions = typeof recipeData.instructions === 'string' 
        ? JSON.parse(recipeData.instructions) 
        : recipeData.instructions;
    } catch (parseError) {
      return res.status(400).json({
        message: 'Invalid ingredients or instructions format',
        code: 'INVALID_FORMAT'
      });
    }

    if (!Array.isArray(ingredients) || !Array.isArray(instructions)) {
      return res.status(400).json({
        message: 'Ingredients and instructions must be arrays',
        code: 'INVALID_ARRAY'
      });
    }

    const finalRecipeData = {
      title: recipeData.title,
      description: recipeData.description,
      prepTime: parseInt(recipeData.prepTime),
      cookTime: parseInt(recipeData.cookTime),
      servings: parseInt(recipeData.servings),
      difficulty: recipeData.difficulty,
      category: recipeData.category,
      ingredients: ingredients,
      instructions: instructions,
      author: req.user._id,
      nutrition: recipeData.nutrition || {},
      notes: recipeData.notes || ''
    };

    if (req.file) {
      console.log('📸 Cloudinary image uploaded:', req.file.path);
      finalRecipeData.imageUrl = req.file.path; // Cloudinary URL
    } else {
      return res.status(400).json({
        message: 'Recipe image is required',
        code: 'IMAGE_REQUIRED'
      });
    }

    // Create and save the recipe first
    const recipe = new Recipe(finalRecipeData);
    await recipe.save();

    // Create recipe added notification
    try {
      await notificationController.createRecipeAddedNotification(
        req.user.id, 
        recipe._id, 
        recipe.title
      );
      console.log('✅ Recipe added notification created');
    } catch (notificationError) {
      console.error('⚠️ Failed to create recipe added notification:', notificationError);
    }

    await User.findByIdAndUpdate(req.user._id, {
      $push: { recipes: recipe._id },
      $inc: { recipesCount: 1 }
    });

    const populatedRecipe = await Recipe.findById(recipe._id)
      .populate('author', 'username profilePicture followersCount recipesCount');

    console.log('✅ Recipe created successfully:', recipe._id);
    res.status(201).json(populatedRecipe);

  } catch (error) {
    console.error('❌ Create recipe error:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating recipe',
      code: 'SERVER_ERROR'
    });
  }
};

exports.updateRecipe = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        message: 'Invalid recipe ID format',
        code: 'INVALID_ID'
      });
    }

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ 
        message: 'Recipe not found',
        code: 'RECIPE_NOT_FOUND'
      });
    }

    if (recipe.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Not authorized to update this recipe',
        code: 'UNAUTHORIZED'
      });
    }

    let updates;
    if (typeof req.body === 'string') {
      updates = JSON.parse(req.body);
    } else if (req.body.data) {
      updates = typeof req.body.data === 'string' 
        ? JSON.parse(req.body.data) 
        : req.body.data;
    } else {
      updates = req.body;
    }

    console.log('Update request received:', { updates, file: req.file });

    if (updates.ingredients) updates.ingredients = parseArrayData(updates.ingredients);
    if (updates.instructions) updates.instructions = parseArrayData(updates.instructions);

    // Handle Cloudinary image updates
    if (req.file) {
      console.log('📸 New Cloudinary image uploaded:', req.file.path);
      updates.imageUrl = req.file.path; // Cloudinary URL
    } else if (req.body.image === '') {
      // Handle image removal when image field is empty string
      console.log('Image removal requested');
      updates.imageUrl = ''; // Remove image URL
    }

    console.log('Final updates to apply:', updates);

    const updatedRecipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('author', 'username profilePicture followersCount recipesCount');

    console.log('Recipe updated successfully:', updatedRecipe._id);

    res.json(updatedRecipe);
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ 
      message: 'Error updating recipe',
      code: 'SERVER_ERROR'
    });
  }
};

exports.getRecipe = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        message: 'Invalid recipe ID format',
        code: 'INVALID_ID'
      });
    }

    const recipe = await Recipe.findById(req.params.id)
      .populate('author', 'username profilePicture followersCount recipesCount');

    if (!recipe) {
      return res.status(404).json({ 
        message: 'Recipe not found',
        code: 'RECIPE_NOT_FOUND'
      });
    }

    const [reviews, similarRecipes] = await Promise.all([
      Review.find({ recipe: req.params.id })
        .populate('author', 'username profilePicture')
        .sort({ createdAt: -1 })
        .limit(5),
      Recipe.find({ 
        category: recipe.category,
        _id: { $ne: req.params.id }
      })
        .limit(4)
        .select('title imageUrl cookTime author')
        .populate('author', 'username profilePicture')
    ]);

    let isFavorite = false;
    if (req.user) {
      const user = await User.findById(req.user._id);
      isFavorite = user.favorites.includes(req.params.id);
    }

    const averageRating = await calculateAverageRating(req.params.id);

    res.json({
      ...recipe.toObject(),
      reviews,
      similarRecipes,
      isFavorite,
      averageRating
    });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ 
      message: 'Error fetching recipe',
      code: 'SERVER_ERROR'
    });
  }
};

exports.getRecipes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const [recipes, total] = await Promise.all([
      Recipe.find(filter)
        .populate('author', 'username profilePicture followersCount recipesCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Recipe.countDocuments(filter)
    ]);

    res.json({
      recipes,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ 
      message: 'Error fetching recipes',
      code: 'SERVER_ERROR'
    });
  }
};

exports.getRecipesByCategory = async (req, res) => {
  try {
    const category = req.params.category;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [recipes, total] = await Promise.all([
      Recipe.find({ category })
        .populate('author', 'username profilePicture followersCount recipesCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Recipe.countDocuments({ category })
    ]);

    res.json({
      recipes,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get recipes by category error:', error);
    res.status(500).json({ 
      message: 'Error fetching recipes by category',
      code: 'SERVER_ERROR'
    });
  }
};

exports.getUserRecipes = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 200;
    const skip = (page - 1) * limit;

    console.log('📋 Fetching recipes for user:', userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        message: 'Invalid user ID',
        code: 'INVALID_ID'
      });
    }

    const [recipes, total] = await Promise.all([
      Recipe.find({ author: userId })
        .populate('author', 'username profilePicture followersCount recipesCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Recipe.countDocuments({ author: userId })
    ]);

    console.log(`✅ Found ${recipes.length} recipes for user ${userId}`);

    res.json({
      recipes,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('❌ Get user recipes error:', error);
    res.status(500).json({ 
      message: 'Error fetching user recipes',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.deleteRecipe = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        message: 'Invalid recipe ID format',
        code: 'INVALID_ID'
      });
    }

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ 
        message: 'Recipe not found',
        code: 'RECIPE_NOT_FOUND'
      });
    }

    if (recipe.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this recipe',
        code: 'UNAUTHORIZED'
      });
    }

    // Note: Cloudinary images remain on their servers
    // You might want to delete them using cloudinary.uploader.destroy()
    if (recipe.imageUrl && recipe.imageUrl.includes('cloudinary')) {
      console.log('📸 Recipe image stored on Cloudinary:', recipe.imageUrl);
    }

    // Remove from users' favorites
    await User.updateMany(
      { favorites: req.params.id },
      { $pull: { favorites: req.params.id } }
    );

    // Delete associated reviews
    await Review.deleteMany({ recipe: req.params.id });

    // Delete the recipe
    await Recipe.deleteOne({ _id: req.params.id });

    // Update user's recipes count
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { recipes: req.params.id },
      $inc: { recipesCount: -1 }
    });

    res.json({ 
      message: 'Recipe deleted successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ 
      message: 'Error deleting recipe',
      code: 'SERVER_ERROR'
    });
  }
};


exports.getSavedRecipes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id)
      .populate({
        path: 'savedRecipes',
        select: 'title description imageUrl prepTime cookTime servings difficulty category rating author',
        options: { skip, limit },
        populate: {
          path: 'author',
          select: 'username profilePicture followersCount recipesCount'
        }
      });

    const total = user.savedRecipes ? user.savedRecipes.length : 0;

    res.json(user.savedRecipes || []);
  } catch (error) {
    console.error('Get saved recipes error:', error);
    res.status(500).json({ 
      message: 'Error fetching saved recipes',
      code: 'SERVER_ERROR'
    });
  }
};

exports.getFavoriteRecipes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id)
      .populate({
        path: 'favorites',
        select: 'title description imageUrl prepTime cookTime servings difficulty category rating author',
        options: { skip, limit },
        populate: {
          path: 'author',
          select: 'username profilePicture followersCount recipesCount'
        }
      });

    const total = user.favorites ? user.favorites.length : 0;

    res.json(user.favorites || []);
  } catch (error) {
    console.error('Get favorite recipes error:', error);
    res.status(500).json({ 
      message: 'Error fetching favorites',
      code: 'SERVER_ERROR'
    });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user._id;

    if (!isValidObjectId(recipeId)) {
      return res.status(400).json({ 
        message: 'Invalid recipe ID',
        code: 'INVALID_ID'
      });
    }

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ 
        message: 'Recipe not found',
        code: 'RECIPE_NOT_FOUND'
      });
    }

    const user = await User.findById(userId);
    const isFavorite = user.favorites.includes(recipeId);

    if (isFavorite) {
      // Remove from favorites
      await User.findByIdAndUpdate(userId, {
        $pull: { favorites: recipeId },
        $inc: { favoritesCount: -1 }
      });
    } else {
      // Add to favorites
      await User.findByIdAndUpdate(userId, {
        $addToSet: { favorites: recipeId },
        $inc: { favoritesCount: 1 }
      });

      // Send notification when adding to favorites
      try {
        await notificationController.createRecipeLikedNotification(
          req.user.id,
          recipe.author._id,
          recipe._id,
          recipe.title
        );
        console.log('✅ Recipe liked notification sent');
      } catch (notificationError) {
        console.error('⚠️ Failed to create recipe liked notification:', notificationError);
      }
    }

    res.json({ 
      isFavorite: !isFavorite,
      message: isFavorite ? 'Removed from favorites' : 'Added to favorites'
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ 
      message: 'Error updating favorites',
      code: 'SERVER_ERROR'
    });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const recipeId = req.params.id;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'Rating must be between 1 and 5',
        code: 'INVALID_RATING'
      });
    }

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ 
        message: 'Recipe not found',
        code: 'RECIPE_NOT_FOUND'
      });
    }

    // Check if user already reviewed this recipe
    const existingReview = await Review.findOne({
      author: userId,
      recipe: recipeId
    });

    if (existingReview) {
      return res.status(400).json({ 
        message: 'You have already reviewed this recipe',
        code: 'DUPLICATE_REVIEW'
      });
    }

    const review = new Review({
      author: userId,
      recipe: recipeId,
      rating,
      comment
    });

    await review.save();

    // FIXED: Send REVIEW notification, not LIKE notification
    try {
      await notificationController.createReviewAddedNotification(
        req.user.id,
        recipe.author._id,
        recipe._id,
        recipe.title
      );
      console.log('✅ Review notification sent');
    } catch (notificationError) {
      console.error('⚠️ Failed to create review notification:', notificationError);
    }

    // Update user's reviews count
    await User.findByIdAndUpdate(userId, {
      $inc: { reviewsCount: 1 }
    });

    // Calculate new average rating for the recipe
    const averageRating = await calculateAverageRating(recipeId);
    await Recipe.findByIdAndUpdate(recipeId, {
      $inc: { reviewCount: 1 },
      rating: averageRating
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ 
      message: 'Error adding review',
      code: 'SERVER_ERROR'
    });
  }
};

exports.getRecipeReviews = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ recipe: recipeId })
        .populate('author', 'username profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ recipe: recipeId })
    ]);

    res.json({
      reviews,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ 
      message: 'Error fetching reviews',
      code: 'SERVER_ERROR'
    });
  }
};

exports.addToFavorites = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user._id;

    if (!isValidObjectId(recipeId)) {
      return res.status(400).json({ 
        message: 'Invalid recipe ID',
        code: 'INVALID_ID'
      });
    }

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ 
        message: 'Recipe not found',
        code: 'RECIPE_NOT_FOUND'
      });
    }

    const user = await User.findById(userId);
    
    // Check if already favorited
    if (user.favorites.includes(recipeId)) {
      return res.status(400).json({ 
        message: 'Recipe already in favorites',
        code: 'ALREADY_FAVORITED'
      });
    }

    // Add to favorites and update count
    user.favorites.push(recipeId);
    user.favoritesCount = user.favorites.length;
    await user.save();

    // Send notification
    try {
      await notificationController.createRecipeLikedNotification(
        req.user.id,
        recipe.author._id,
        recipe._id,
        recipe.title
      );
      console.log('✅ Recipe liked notification sent');
    } catch (notificationError) {
      console.error('⚠️ Failed to create recipe liked notification:', notificationError);
    }

    res.json({ 
      message: 'Recipe added to favorites',
      isFavorited: true,
      favoritesCount: user.favoritesCount
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ 
      message: 'Error adding to favorites',
      code: 'SERVER_ERROR'
    });
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user._id;

    if (!isValidObjectId(recipeId)) {
      return res.status(400).json({ 
        message: 'Invalid recipe ID',
        code: 'INVALID_ID'
      });
    }

    const user = await User.findById(userId);
    
    // Check if recipe is in favorites
    if (!user.favorites.includes(recipeId)) {
      return res.status(400).json({ 
        message: 'Recipe not in favorites',
        code: 'NOT_IN_FAVORITES'
      });
    }

    // Remove from favorites and update count
    user.favorites = user.favorites.filter(fav => fav.toString() !== recipeId);
    user.favoritesCount = user.favorites.length;
    await user.save();

    res.json({ 
      message: 'Recipe removed from favorites',
      isFavorited: false,
      favoritesCount: user.favoritesCount
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ 
      message: 'Error removing from favorites',
      code: 'SERVER_ERROR'
    });
  }
};

exports.saveRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user._id;

    if (!isValidObjectId(recipeId)) {
      return res.status(400).json({ 
        message: 'Invalid recipe ID',
        code: 'INVALID_ID'
      });
    }

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ 
        message: 'Recipe not found',
        code: 'RECIPE_NOT_FOUND'
      });
    }

    const user = await User.findById(userId);
    
    // Initialize savedRecipes array if it doesn't exist
    if (!user.savedRecipes) {
      user.savedRecipes = [];
    }
    
    // Check if already saved
    if (user.savedRecipes.includes(recipeId)) {
      return res.status(400).json({ 
        message: 'Recipe already saved',
        code: 'ALREADY_SAVED'
      });
    }

    // Add to saved recipes
    user.savedRecipes.push(recipeId);
    await user.save();

    // Send notification
    try {
      await notificationController.createRecipeSavedNotification(
        req.user.id,
        recipe.author._id,
        recipe._id,
        recipe.title
      );
      console.log('✅ Recipe saved notification sent');
    } catch (notificationError) {
      console.error('⚠️ Failed to create recipe saved notification:', notificationError);
    }

    res.json({ 
      message: 'Recipe saved',
      isSaved: true
    });
  } catch (error) {
    console.error('Save recipe error:', error);
    res.status(500).json({ 
      message: 'Error saving recipe',
      code: 'SERVER_ERROR'
    });
  }
};

exports.removeSavedRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user._id;

    if (!isValidObjectId(recipeId)) {
      return res.status(400).json({ 
        message: 'Invalid recipe ID',
        code: 'INVALID_ID'
      });
    }

    const user = await User.findById(userId);
    
    // Check if recipe is saved
    if (!user.savedRecipes || !user.savedRecipes.includes(recipeId)) {
      return res.status(400).json({ 
        message: 'Recipe not in saved recipes',
        code: 'NOT_IN_SAVED'
      });
    }

    // Remove from saved recipes
    user.savedRecipes = user.savedRecipes.filter(saved => saved.toString() !== recipeId);
    await user.save();

    res.json({ 
      message: 'Recipe removed from saved',
      isSaved: false
    });
  } catch (error) {
    console.error('Remove saved recipe error:', error);
    res.status(500).json({ 
      message: 'Error removing from saved recipes',
      code: 'SERVER_ERROR'
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id: recipeId, reviewId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(recipeId) || !isValidObjectId(reviewId)) {
      return res.status(400).json({ 
        message: 'Invalid ID format',
        code: 'INVALID_ID'
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      recipe: recipeId
    });

    if (!review) {
      return res.status(404).json({ 
        message: 'Review not found',
        code: 'REVIEW_NOT_FOUND'
      });
    }

    // Check if user owns the review
    if (review.author.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this review',
        code: 'UNAUTHORIZED'
      });
    }

    await Review.deleteOne({ _id: reviewId });

    // Update user's reviews count
    await User.findByIdAndUpdate(userId, {
      $inc: { reviewsCount: -1 }
    });

    // Recalculate average rating for the recipe
    const averageRating = await calculateAverageRating(recipeId);
    await Recipe.findByIdAndUpdate(recipeId, {
      $inc: { reviewCount: -1 },
      rating: averageRating
    });

    res.json({ 
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ 
      message: 'Error deleting review',
      code: 'SERVER_ERROR'
    });
  }
};

exports.reportRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const { reason } = req.body;
    const userId = req.user._id;

    if (!isValidObjectId(recipeId)) {
      return res.status(400).json({ 
        message: 'Invalid recipe ID',
        code: 'INVALID_ID'
      });
    }

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ 
        message: 'Recipe not found',
        code: 'RECIPE_NOT_FOUND'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Reason is required',
        code: 'MISSING_REASON'
      });
    }

    console.log(`🚨 Recipe reported - ID: ${recipeId}, User: ${userId}, Reason: ${reason}`);

    res.json({ 
      message: 'Recipe reported successfully. Our team will review it shortly.'
    });
  } catch (error) {
    console.error('Report recipe error:', error);
    res.status(500).json({ 
      message: 'Error reporting recipe',
      code: 'SERVER_ERROR'
    });
  }
};

exports.shareRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const { platform } = req.body;

    if (!isValidObjectId(recipeId)) {
      return res.status(400).json({ 
        message: 'Invalid recipe ID',
        code: 'INVALID_ID'
      });
    }

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ 
        message: 'Recipe not found',
        code: 'RECIPE_NOT_FOUND'
      });
    }

    // Generate share URL based on platform
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const recipeUrl = `${baseUrl}/recipes/${recipeId}`;
    
    let shareUrl;
    const encodedUrl = encodeURIComponent(recipeUrl);
    const encodedTitle = encodeURIComponent(recipe.title);

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        break;
      case 'copy':
        shareUrl = recipeUrl;
        break;
      default:
        return res.status(400).json({ 
          message: 'Unsupported platform',
          code: 'UNSUPPORTED_PLATFORM'
        });
    }

    res.json({ 
      url: shareUrl,
      message: platform === 'copy' ? 'Link copied to clipboard' : `Share URL generated for ${platform}`
    });
  } catch (error) {
    console.error('Share recipe error:', error);
    res.status(500).json({ 
      message: 'Error generating share URL',
      code: 'SERVER_ERROR'
    });
  }
};

exports.searchRecipes = async (req, res) => {
  try {
    const { q: query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Search query is required',
        code: 'MISSING_QUERY'
      });
    }

    const searchFilter = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'ingredients.name': { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ]
    };

    const [recipes, total] = await Promise.all([
      Recipe.find(searchFilter)
        .populate('author', 'username profilePicture followersCount recipesCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Recipe.countDocuments(searchFilter)
    ]);

    res.json({
      recipes,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      query
    });
  } catch (error) {
    console.error('Search recipes error:', error);
    res.status(500).json({ 
      message: 'Error searching recipes',
      code: 'SERVER_ERROR'
    });
  }
};