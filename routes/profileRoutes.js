const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { uploadCover, uploadProfile } = require('../middleware/cloudinaryUpload');
const { auth } = require('../middleware/authMiddleware');

// Debug middleware imports
console.log('🔍 Profile Routes - Checking imports:');
console.log('   profileController type:', typeof profileController);
console.log('   uploadCover type:', typeof uploadCover);
console.log('   uploadProfile type:', typeof uploadProfile);

// Apply authentication to all profile routes
router.use(auth);

// IMPORTANT: Place specific routes BEFORE parameterized routes
// Chefs route - MUST come before /:userId
router.get('/chefs', profileController.getChefs);

// Stats routes
router.get('/stats', profileController.getUserStats);
router.get('/stats/:userId', profileController.getUserStats);

// Author profile - specific route
router.get('/author/:userId', profileController.getAuthorProfile);

// Follow routes
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

// Upload routes
router.post('/cover', uploadCover, profileController.uploadCoverPicture);
router.post('/profile-picture', uploadProfile, profileController.uploadProfilePicture);

// Main profile routes - these should come after specific routes
router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.get('/:userId', profileController.getUserProfile); // This is the parameterized route - must be last

module.exports = router;