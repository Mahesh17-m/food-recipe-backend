const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const oauthController = require('../controllers/oauthController');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { auth } = require('../middleware/authMiddleware');
const passport = require('passport');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { profileUpload } = require('../middleware/cloudinaryUpload');

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests, please try again later'
});
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many password reset attempts, please try again later'
});
router.use(authLimiter);

// Input validation helper
const validateAuthInput = (route) => {
  switch (route) {
    case 'register':
      return [
        body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 3 }),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 })
      ];
    case 'login':
      return [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty()
      ];
    default:
      return [];
  }
};

// Register
router.post('/register', validateAuthInput('register'), async (req, res) => {
  console.log('Route: POST /register');
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  await authController.register(req, res);
});

// Login
router.post('/login', validateAuthInput('login'), async (req, res) => {
  console.log('Route: POST /login');
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  await authController.login(req, res);
});

// Refresh token
router.post('/refresh-token', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required', code: 'NO_REFRESH_TOKEN' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
  }
});
router.get('/google', oauthController.googleAuth);

router.get('/google/callback', oauthController.googleCallback);

// Link Google account (requires authentication)
router.post('/link-google', auth, async (req, res) => {
  await oauthController.linkGoogleAccount(req, res);
});
// Forgot password
router.post('/forgot-password', 
  passwordResetLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await authController.forgotPassword(req, res);
  }
);
router.get('/verify-reset-token/:token', async (req, res) => {
  await authController.verifyResetToken(req, res);
});
// Reset password
router.post('/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await authController.resetPassword(req, res);
  }
);
router.post('/check-auth-method', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(200).json({
        exists: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      exists: true,
      provider: user.provider || 'local',
      hasPassword: !!user.password,
      emailVerified: user.emailVerified || false
    });
  } catch (error) {
    console.error('Check auth method error:', error);
    res.status(500).json({
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
});
// Logout
router.post('/logout', (req, res) => {
  console.log('Route: POST /logout');
  res.json({ message: 'Logout successful' });
});

// Profile (protected)
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('Route: GET /profile, User ID:', req.user.id);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error.stack);
    res.status(500).json({ message: error.message });
  }
});

// Profile picture upload - FIXED: Added proper controller function
// Profile picture upload
router.post('/profile/picture', auth, profileUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    const user = await User.findById(req.user.id);
    
    // Delete old picture if exists (not default)
    if (user.profilePicture && !user.profilePicture.includes('default-avatar')) {
      const fs = require('fs');
      const path = require('path');
      const oldImagePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Fix: Ensure the path is correct
    const imageUrl = `/uploads/profile/${req.file.filename}`;
    user.profilePicture = imageUrl;
    await user.save();

    // Return the updated user with proper image URL
    const updatedUser = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires');

    res.json({ 
      ...updatedUser.toObject(),
      message: 'Profile picture updated successfully'
    });
  } catch (err) {
    console.error('Upload profile picture error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
});
// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, email, tagline } = req.body;
    
    // Check if username already exists (excluding current user)
    if (username) {
      const existingUser = await User.findOne({ 
        username: username.toLowerCase(),
        _id: { $ne: req.user.id }
      });
      if (existingUser) {
        return res.status(400).json({
          message: 'Username already taken',
          code: 'USERNAME_EXISTS'
        });
      }
    }

    // Check if email already exists (excluding current user)
    if (email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.user.id }
      });
      if (existingUser) {
        return res.status(400).json({
          message: 'Email already registered',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (tagline !== undefined) updates.tagline = tagline;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json(user);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Current password is incorrect',
        code: 'INCORRECT_PASSWORD'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Delete account
router.delete('/account', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;