const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

if (mongoose.models.User) {
  module.exports = mongoose.model('User');
} else {
  const userSchema = new mongoose.Schema({
   username: {
      type: String,
      required: function() { return !this.googleId; }, // Only required for local auth
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      sparse: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      sparse: true
    },
    password: {
      type: String,
      required: function() { return !this.googleId; }, // Only required for local auth
      minlength: 6
    },
     googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordResetAttempts: {
      type: Number,
      default: 0
    },
    lastPasswordReset: Date,
    
    profilePicture: {
      type: String,
      default: '/uploads/profile/default-avatar.jpg'
    },
    coverPicture: {
      type: String,
      default: '/uploads/profile/default-cover.jpg'
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: 100
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100
    },
    website: {
      type: String,
      trim: true
    },
    socialMedia: {
      twitter: { type: String, trim: true },
      instagram: { type: String, trim: true },
      facebook: { type: String, trim: true },
      youtube: { type: String, trim: true },
      linkedin: { type: String, trim: true }
    },
    interests: [{
      type: String,
      trim: true
    }],
    specialties: [{
      type: String,
      trim: true
    }],
    cookingStyle: {
      type: String,
      trim: true,
      maxlength: 100
    },
    favoriteIngredients: [{
      type: String,
      trim: true
    }],
    recipesCount: {
      type: Number,
      default: 0
    },
    favoritesCount: {
      type: Number,
      default: 0
    },
    reviewsCount: {
      type: Number,
      default: 0
    },
    followersCount: {
      type: Number,
      default: 0
    },
    followingCount: {
      type: Number,
      default: 0
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    memberSince: {
      type: Date,
      default: Date.now
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isProChef: {
      type: Boolean,
      default: false
    },
    proChefInfo: {
      certification: { type: String, trim: true },
      experience: { type: String, trim: true },
      restaurant: { type: String, trim: true },
      awards: [{ type: String, trim: true }]
    },
    privacySettings: {
      showEmail: { type: Boolean, default: false },
      showFollowers: { type: Boolean, default: true },
      showFollowing: { type: Boolean, default: true },
      showActivity: { type: Boolean, default: true }
    },
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      followerNotifications: { type: Boolean, default: true },
      recipeNotifications: { type: Boolean, default: true }
    },
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipe',
      validate: {
        validator: function(v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: 'Invalid recipe ID'
      }
    }],
    savedRecipes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipe',
      validate: {
        validator: function(v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: 'Invalid recipe ID'
      }
    }],
    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      validate: {
        validator: function(v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: 'Invalid user ID'
      }
    }],
    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      validate: {
        validator: function(v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: 'Invalid user ID'
      }
    }],
    badges: [{
      name: String,
      icon: String,
      earnedAt: Date,
      description: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
  }, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });
 userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    this.passwordResetAttempts = 0;
    
    return resetToken;
  };
  // Virtual for total recipes interactions
  userSchema.virtual('totalInteractions').get(function() {
    return (this.totalLikes || 0) + (this.totalViews || 0);
  });

  // Virtual for engagement rate
  userSchema.virtual('engagementRate').get(function() {
    if (this.followersCount === 0) return 0;
    return ((this.totalInteractions || 0) / this.followersCount * 100).toFixed(1);
  });

  userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  });

  userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
  });

  userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      return false;
    }
  };

  module.exports = mongoose.model('User', userSchema);
}