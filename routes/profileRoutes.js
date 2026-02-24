const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { uploadCover, uploadProfile } = require('../middleware/cloudinaryUpload');
const { auth } = require('../middleware/authMiddleware'); // Import auth middleware

// Debug middleware imports
console.log('🔍 Profile Routes - Checking imports:');
console.log('   profileController type:', typeof profileController);
console.log('   uploadCover type:', typeof uploadCover);
console.log('   uploadProfile type:', typeof uploadProfile);

// Apply authentication to all profile routes
router.use(auth); // Use the auth middleware directly

// Profile routes
router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.get('/stats', profileController.getUserStats);
router.get('/stats/:userId', profileController.getUserStats);
router.get('/:userId', profileController.getUserProfile);
router.get('/author/:userId', profileController.getAuthorProfile);

// Upload routes
router.post('/cover', uploadCover, profileController.uploadCoverPicture);
router.post('/profile-picture', uploadProfile, profileController.uploadProfilePicture);

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