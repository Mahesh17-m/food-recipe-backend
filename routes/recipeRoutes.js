const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const { recipeUpload } = require('../middleware/upload');
const recipeController = require('../controllers/recipeController');

// Public routes
router.get('/', recipeController.getRecipes);
router.get('/search', recipeController.searchRecipes);
router.get('/:id', recipeController.getRecipe);
router.get('/category/:category', recipeController.getRecipesByCategory);
router.get('/:id/reviews', recipeController.getRecipeReviews);

// Authenticated routes
router.use(auth); // Apply auth to all routes below

// User recipes
router.get('/user/me', recipeController.getUserRecipes);
router.get('/user/:userId', recipeController.getUserRecipes);

// Favorites routes
router.get('/favorites/me', recipeController.getFavoriteRecipes);
router.post('/:id/favorite', recipeController.addToFavorites);
router.delete('/:id/favorite', recipeController.removeFavorite);

// Saved recipes routes
router.get('/saved/me', recipeController.getSavedRecipes);
router.post('/:id/save', recipeController.saveRecipe);
router.delete('/:id/save', recipeController.removeSavedRecipe);

// Recipe management
router.post('/', recipeUpload, recipeController.createRecipe);
router.put('/:id', recipeUpload, recipeController.updateRecipe);
router.delete('/:id', recipeController.deleteRecipe);

// Reviews
router.post('/:id/reviews', recipeController.addReview);
router.delete('/:id/reviews/:reviewId', recipeController.deleteReview);

// Additional features
router.post('/:id/report', recipeController.reportRecipe);
router.post('/:id/share', recipeController.shareRecipe);

module.exports = router;