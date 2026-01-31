// In your routes file (e.g., routes/profile.js)
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authController = require('../controllers/authController');
const { uploadProfilePicture, uploadCoverPicture } = require('../middleware/cloudinaryUpload');

// Profile routes
router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.get('/stats', profileController.getUserStats);
router.get('/stats/:userId', profileController.getUserStats);
router.get('/:userId', profileController.getUserProfile);
router.get('/author/:userId', profileController.getAuthorProfile);

// Upload routes - FIXED with correct middleware
router.post('/picture', uploadProfilePicture, profileController.uploadProfilePicture);
router.post('/cover', uploadCoverPicture, profileController.uploadCoverPicture);

// Follow routes
router.post('/follow/:userId', profileController.toggleFollow);
router.get('/followers', profileController.getFollowers);
router.get('/followers/:userId', profileController.getFollowers);
router.get('/following', profileController.getFollowing);
router.get('/following/:userId', profileController.getFollowing);

// Recipe collections
router.get('/saved-recipes', profileController.getSavedRecipes);
router.get('/favorite-recipes', profileController.getFavoriteRecipes);
router.get('/:userId/recipes', profileController.getUserRecipes);

// Badges
router.get('/badges', profileController.getUserBadges);
router.get('/badges/:userId', profileController.getUserBadges);
router.post('/badges', profileController.addBadge);

// Activity
router.get('/activity', profileController.getUserActivity);

// Chefs
router.get('/chefs', profileController.getChefs);

module.exports = router;