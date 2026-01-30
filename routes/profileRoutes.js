const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { auth } = require('../middleware/authMiddleware');
const { profileUpload, coverUpload } = require('../middleware/upload');

// User profile routes
router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);
router.post('/upload', auth, profileUpload, profileController.uploadProfilePicture);
router.post('/upload-cover', auth, coverUpload, profileController.uploadCoverPicture);

// Stats and badges
router.get('/stats/:userId?', auth, profileController.getUserStats);
router.get('/badges/:userId?', auth, profileController.getUserBadges);
router.post('/badges', auth, profileController.addBadge);

// Follow routes
router.post('/follow/:userId', auth, profileController.toggleFollow);
router.get('/followers/:userId?', auth, profileController.getFollowers);
router.get('/following/:userId?', auth, profileController.getFollowing);

// Recipe collections
router.get('/saved-recipes', auth, profileController.getSavedRecipes);
router.get('/favorite-recipes', auth, profileController.getFavoriteRecipes);

// Activity
router.get('/activity', auth, profileController.getUserActivity);
router.get('/chefs', profileController.getChefs);

// User public routes - THIS SHOULD BE LAST
router.get('/:userId', auth, profileController.getUserProfile);
router.get('/author/:userId', auth, profileController.getAuthorProfile);
router.get('/:userId/recipes', auth, profileController.getUserRecipes);

module.exports = router;