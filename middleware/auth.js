const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false,
                message: 'No token provided',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const userId = decoded.userId || decoded.id;
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        const user = await User.findById(userId)
            .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        req.user = user;
        req.userId = user._id;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
};

module.exports = auth;