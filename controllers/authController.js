const User = require('../models/User');
const Recipe = require('../models/Recipe');  // ADD THIS
const Review = require('../models/Review');  // ADD THIS
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const notificationController = require('./notificationController');
const crypto = require('crypto');
const emailService = require('../Services/emailService');

exports.register = async (req, res) => {
  const { name, email, password, username } = req.body;

  try {
    console.log('👤 Registration attempt:', { name, email, username });

    // Check if email already exists
    const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingUserByEmail) {
      return res.status(400).json({ 
        message: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // Check if username already exists
    const existingUserByUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUserByUsername) {
      return res.status(400).json({ 
        message: 'Username already taken',
        code: 'USERNAME_EXISTS'
      });
    }

    const newUser = new User({
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: password.trim()
    });

    await newUser.save();
    console.log('✅ User saved successfully:', newUser.email);

    // Create welcome notification
    try {
      await notificationController.createWelcomeNotification(newUser._id);
    } catch (notificationError) {
      console.error('⚠️ Failed to create welcome notification:', notificationError);
    }

    // Create tokens with userId
    const token = jwt.sign(
      { userId: newUser._id.toString(), email: newUser.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    const refreshToken = jwt.sign(
      { userId: newUser._id.toString() }, 
      process.env.JWT_REFRESH_SECRET, 
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      token,
      refreshToken,
      user: { 
        _id: newUser._id,
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        profilePicture: newUser.profilePicture,
        coverPicture: newUser.coverPicture
      }
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({ 
        message: errors.join(', '),
        code: 'VALIDATION_ERROR'
      });
    }
    
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ 
        message: `${field} already exists`,
        code: `${field.toUpperCase()}_EXISTS`
      });
    }
    
    return res.status(500).json({ 
      message: 'Registration failed. Please try again.',
      code: 'REGISTRATION_FAILED'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({ 
        message: 'Invalid email or password', 
        code: 'INVALID_CREDENTIALS'
      });
    }

    console.log('✅ User found:', user.email);

    const isMatch = await user.comparePassword(password.trim());
    console.log('🔑 Password match:', isMatch);

    if (!isMatch) {
      console.log('❌ Password does not match for user:', user.email);
      return res.status(401).json({ 
        message: 'Invalid email or password', 
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Create login notification
    try {
      await notificationController.createLoginNotification(user._id);
      console.log('✅ Login notification created for:', user.email);
    } catch (notificationError) {
      console.error('⚠️ Failed to create login notification:', notificationError);
    }

    console.log('✅ Login successful for:', user.email);

    // Create tokens
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user._id.toString() }, 
      process.env.JWT_REFRESH_SECRET, 
      { expiresIn: '30d' }
    );

    // Get counts - FIXED: Use try-catch for each query
    let recipesCount = 0;
    let favoritesCount = 0;
    let reviewsCount = 0;
    
    try {
      recipesCount = await Recipe.countDocuments({ author: user._id });
    } catch (err) {
      console.error('Error counting recipes:', err);
    }
    
    try {
      favoritesCount = user.favorites ? user.favorites.length : 0;
    } catch (err) {
      console.error('Error counting favorites:', err);
    }
    
    try {
      reviewsCount = await Review.countDocuments({ author: user._id });
    } catch (err) {
      console.error('Error counting reviews:', err);
    }

    return res.status(200).json({
      token,
      refreshToken,
      user: { 
        _id: user._id, 
        id: user._id,
        email: user.email,
        name: user.name,
        username: user.username,
        profilePicture: user.profilePicture,
        coverPicture: user.coverPicture,
        tagline: user.tagline,
        recipesCount,
        favoritesCount,
        reviewsCount,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({ 
      message: 'Server error during login',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Password reset functionality
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }
    
    console.log('🔐 Forgot password request for:', email);
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      console.log('📧 Email not found (but returning success for security):', email);
      return res.status(200).json({
        message: 'If your email exists, you will receive a password reset link',
        code: 'RESET_EMAIL_SENT'
      });
    }
    
    // Check if user uses Google OAuth (no local password)
    if (user.provider === 'google' && !user.password) {
      return res.status(400).json({
        message: 'This account uses Google Sign-In. Please use Google to login.',
        code: 'GOOGLE_ACCOUNT'
      });
    }
    
    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save();
    
    // Create reset URL
    const resetURL = `${process.env.CLIENT_URL || 'http://localhost:4200'}/reset-password/${resetToken}`;
    
    // Send email - WITH ERROR HANDLING
    try {
      if (emailService && emailService.sendPasswordResetEmail) {
        await emailService.sendPasswordResetEmail(user.email, resetURL, user.name);
        console.log('✅ Password reset email sent to:', user.email);
      } else {
        console.warn('⚠️ Email service not available, skipping email sending');
      }
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message || emailError);
      // Continue even if email fails - we still want to return success
    }
    
    // In development, log the reset token
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 DEV: Reset token:', resetToken);
      console.log('🔧 DEV: Reset URL:', resetURL);
    }
    
    return res.status(200).json({
      message: 'If your email exists, you will receive a password reset link',
      code: 'RESET_EMAIL_SENT'
    });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    return res.status(500).json({
      message: 'Server error processing request',
      code: 'SERVER_ERROR'
    });
  }
};

exports.refreshToken = (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ 
      message: 'Refresh token required', 
      code: 'NO_REFRESH_TOKEN' 
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (!decoded || !decoded.userId) {
      return res.status(403).json({ 
        message: 'Invalid refresh token', 
        code: 'INVALID_REFRESH_TOKEN' 
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    // Optionally generate new refresh token
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId }, 
      process.env.JWT_REFRESH_SECRET, 
      { expiresIn: '30d' }
    );

    return res.json({ 
      token: newAccessToken,
      refreshToken: newRefreshToken 
    });
  } catch (err) {
    console.error('❌ Refresh token error:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        message: 'Refresh token expired', 
        code: 'REFRESH_TOKEN_EXPIRED' 
      });
    }
    
    return res.status(403).json({ 
      message: 'Invalid refresh token', 
      code: 'INVALID_REFRESH_TOKEN' 
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        message: 'Token and new password are required',
        code: 'INVALID_REQUEST'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters',
        code: 'PASSWORD_TOO_SHORT'
      });
    }
    
    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Check reset attempts
    if (user.passwordResetAttempts >= 5) {
      return res.status(400).json({
        message: 'Too many reset attempts. Please request a new reset link.',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }
    
    // Check if new password is same as old (optional security measure)
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      user.passwordResetAttempts += 1;
      await user.save();
      
      return res.status(400).json({
        message: 'New password must be different from old password',
        code: 'SAME_PASSWORD'
      });
    }
    
    // Update user password
    user.password = newPassword.trim();
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetAttempts = 0;
    user.lastPasswordReset = Date.now();
    await user.save();
    
    console.log('✅ Password reset successfully for:', user.email);
    
    // Send confirmation email - WITH ERROR HANDLING
    try {
      if (emailService && emailService.sendPasswordResetConfirmation) {
        await emailService.sendPasswordResetConfirmation(user.email, user.name);
      }
    } catch (emailError) {
      console.error('❌ Confirmation email failed:', emailError.message || emailError);
    }
    
    return res.status(200).json({
      message: 'Password reset successful. You can now login with your new password.',
      code: 'PASSWORD_RESET_SUCCESS'
    });
  } catch (err) {
    console.error('❌ Reset password error:', err);
    return res.status(500).json({
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        message: 'Token is required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN',
        valid: false
      });
    }
    
    return res.status(200).json({
      message: 'Token is valid',
      code: 'TOKEN_VALID',
      valid: true,
      email: user.email
    });
  } catch (err) {
    console.error('❌ Verify token error:', err);
    return res.status(500).json({
      message: 'Server error',
      code: 'SERVER_ERROR',
      valid: false
    });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    console.log('🔄 Resetting password for:', email);
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword.trim();
    await user.save();
    
    console.log('✅ Password reset successfully for:', email);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};