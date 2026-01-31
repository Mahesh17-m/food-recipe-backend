const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { auth } = require('../middleware/authMiddleware');
const { profileUpload, coverUpload } = require('../middleware/cloudinaryUpload');

// ============ AUTHENTICATED USER ROUTES ============
router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);

// ============ IMAGE UPLOAD ROUTES ============
// Profile picture upload with proper error handling
router.post('/picture', auth, (req, res, next) => {
  profileUpload(req, res, (err) => {
    if (err) {
      console.error('❌ Profile upload middleware error:', err.message);
      return res.status(400).json({
        message: err.message || 'File upload failed',
        code: 'UPLOAD_ERROR'
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }
    
    console.log('✅ File ready for controller:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });
    
    next();
  });
}, profileController.uploadProfilePicture);

// Cover picture upload with proper error handling
router.post('/cover', auth, (req, res, next) => {
  coverUpload(req, res, (err) => {
    if (err) {
      console.error('❌ Cover upload middleware error:', err.message);
      return res.status(400).json({
        message: err.message || 'File upload failed',
        code: 'UPLOAD_ERROR'
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }
    
    console.log('✅ Cover file ready for controller:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });
    
    next();
  });
}, profileController.uploadCoverPicture);

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