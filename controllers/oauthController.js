const User = require('../models/User');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const crypto = require('crypto');

// Google OAuth Strategy Setup
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Check if Google credentials are configured
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️  Google OAuth credentials not found. Google login will be disabled.');
  console.warn('   Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file');
} else {
  console.log('✅ Google OAuth credentials found');
  
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/google/callback`,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔐 Google OAuth attempt:', profile.emails[0].value);
        
        // Check if user exists with this googleId
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          console.log('✅ Existing Google user found:', user.email);
          // Update last active
          user.lastActive = Date.now();
          await user.save();
          return done(null, user);
        }
        
        // Check if user exists with same email (account merging)
        user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
        
        if (user) {
          console.log('🔗 Linking Google to existing account:', user.email);
          // Link Google account to existing user
          user.googleId = profile.id;
          user.provider = 'google';
          user.emailVerified = true;
          user.profilePicture = profile.photos[0].value || user.profilePicture;
          await user.save();
          return done(null, user);
        }
        
        // Create new user from Google
        const username = profile.displayName
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase() + Math.floor(Math.random() * 1000);
        
        user = new User({
          googleId: profile.id,
          provider: 'google',
          email: profile.emails[0].value.toLowerCase(),
          emailVerified: true,
          name: profile.displayName,
          username: username,
          profilePicture: profile.photos[0].value || '/uploads/profile/default-avatar.jpg',
          isVerified: true
        });
        
        await user.save();
        console.log('✅ New Google user created:', user.email);
        
        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth error:', error);
        return done(error, null);
      }
    }
  ));
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google Authentication Endpoints
exports.googleAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      message: 'Google OAuth is not configured',
      code: 'OAUTH_NOT_CONFIGURED'
    });
  }
  
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
};

exports.googleCallback = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:4200'}/login?error=oauth_not_configured`);
  }
  
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error('❌ Google callback error:', err);
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:4200'}/login?error=auth_failed`);
    }
    
    if (!user) {
      console.error('❌ Google user not found');
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:4200'}/login?error=user_not_found`);
    }
    
    try {
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
      
      // Create user response object
      const userResponse = {
        _id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
        provider: user.provider,
        googleId: user.googleId,
        emailVerified: user.emailVerified
      };
      
      // Redirect with tokens
      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:4200'}/oauth-callback?token=${token}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify(userResponse))}`;
      console.log('✅ Google OAuth successful, redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Token generation error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:4200'}/login?error=token_error`);
    }
  })(req, res, next);
};

// Check OAuth status
exports.getOAuthStatus = (req, res) => {
  const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  
  res.json({
    googleEnabled: isConfigured,
    clientId: isConfigured ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : null
  });
};