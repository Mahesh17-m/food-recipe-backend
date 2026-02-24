const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔑 Token decoded:', { userId: decoded.userId, exp: decoded.exp });
      
      // Get userId from either userId or id field
      const userId = decoded.userId || decoded.id || decoded._id;
      if (!userId) {
        console.error('❌ No user ID in token:', decoded);
        return res.status(401).json({ 
          message: 'Invalid token structure',
          code: 'INVALID_TOKEN'
        });
      }

      const user = await User.findById(userId)
        .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');
      
      if (!user) {
        console.error('❌ User not found for ID:', userId);
        return res.status(401).json({ 
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Attach user to request - ensure id property exists
      req.user = {
        ...user.toObject(),
        id: user._id.toString() // Explicitly add id property
      };
      
      console.log('✅ Auth successful for user:', user.email);
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        console.log('⏰ Token expired');
        return res.status(401).json({ 
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        console.log('❌ Invalid token:', jwtError.message);
        return res.status(401).json({ 
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Admin middleware
const admin = async (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ 
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

module.exports = { auth, admin };