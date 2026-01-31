const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { auth } = require('../middleware/authMiddleware');
const { profileUpload, coverUpload } = require('../middleware/cloudinaryUpload');

// ============ AUTHENTICATED USER ROUTES ============
router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);

// ============ IMAGE UPLOAD ROUTES (MUST COME BEFORE :userId) ============
router.post('/picture', auth, profileUpload, profileController.uploadProfilePicture);
router.post('/cover', auth, coverUpload, profileController.uploadCoverPicture);

// ============ STATS AND BADGES ============
router.get('/stats/:userId?', auth, profileController.getUserStats);
router.get('/badges/:userId?', auth, profileController.getUserBadges);
router.post('/badges', auth, profileController.addBadge);

// ============ FOLLOW ROUTES ============
router.post('/follow/:userId', auth, profileController.toggleFollow);
router.get('/followers/:userId?', auth, profileController.getFollowers);
router.get('/following/:userId?', auth, profileController.getFollowing);

// ============ RECIPE COLLECTIONS ============
router.get('/saved-recipes', auth, profileController.getSavedRecipes);
router.get('/favorite-recipes', auth, profileController.getFavoriteRecipes);

// ============ ACTIVITY ============
router.get('/activity', auth, profileController.getUserActivity);
router.get('/chefs', profileController.getChefs);

// ============ USER PUBLIC ROUTES ============
router.get('/:userId', auth, profileController.getUserProfile);
router.get('/author/:userId', auth, profileController.getAuthorProfile);
router.get('/:userId/recipes', auth, profileController.getUserRecipes);

module.exports = router;