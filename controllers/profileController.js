const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Review = require('../models/Review');
const userService = require('../Services/userService');
const notificationController = require('./notificationController');
const middleware = require('../middleware/cloudinaryUpload')

const calculateUserLevel = (stats) => {
  const points = (stats.recipesCount || 0) * 10 + 
                (stats.followersCount || 0) * 5 + 
                (stats.reviewsCount || 0) * 3 + 
                (stats.totalLikes || 0) * 2 + 
                (stats.totalViews || 0);
  
  if (points >= 10000) return 'Master Chef';
  if (points >= 5000) return 'Expert Chef';
  if (points >= 2000) return 'Advanced Chef';
  if (points >= 500) return 'Intermediate Chef';
  if (points >= 100) return 'Beginner Chef';
  return 'New Cook';
};

// Get User Stats endpoint
exports.getUserStats = async (req, res) => {
  try {
    console.log('📊 Getting user stats for:', req.params.userId || req.user.id);
    const userId = req.params.userId || req.user.id;
    
    const stats = await userService.getEnrichedUserStats(userId);
    const userLevel = calculateUserLevel(stats);
    
    res.json({ 
      ...stats,
      userLevel,
      message: 'User stats retrieved successfully'
    });
  } catch (err) {
    console.error('❌ Get user stats error:', err);
    res.status(500).json({ 
      message: 'Server error while fetching user stats',
      code: 'SERVER_ERROR'
    });
  }
};

// Get Profile endpoint
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('savedRecipes', 'title imageUrl rating')
      .populate('favorites', 'title imageUrl rating')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const stats = await userService.getEnrichedUserStats(req.user.id);
    const userLevel = calculateUserLevel(stats);

    // Merge user data with stats
    const response = {
      ...user,
      ...stats,
      userLevel,
      isFollowing: false
    };

    // Ensure coverPicture is always included
    if (!response.coverPicture && user.coverPicture) {
      response.coverPicture = user.coverPicture;
    }

    console.log('✅ Profile response sent with coverPicture:', response.coverPicture);
    
    res.json(response);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Update Profile endpoint
exports.updateProfile = async (req, res) => {
  try {
    console.log('✏️ Updating profile for user:', req.user.id);
    
    const { 
      username, 
      email, 
      tagline, 
      bio, 
      location, 
      website,
      cookingStyle,
      interests,
      specialties,
      favoriteIngredients,
      socialMedia,
      privacySettings,
      notificationSettings,
      isProChef,
      proChefInfo
    } = req.body;

    // Check for duplicate username
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

    // Check for duplicate email
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

    // Prepare updates object
    const updates = {};
    
    // Basic info
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (tagline !== undefined) updates.tagline = tagline;
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    if (website !== undefined) updates.website = website;
    if (cookingStyle !== undefined) updates.cookingStyle = cookingStyle;
    
    // Arrays
    if (interests !== undefined) updates.interests = Array.isArray(interests) ? interests.filter(i => i.trim()) : [];
    if (specialties !== undefined) updates.specialties = Array.isArray(specialties) ? specialties.filter(s => s.trim()) : [];
    if (favoriteIngredients !== undefined) updates.favoriteIngredients = Array.isArray(favoriteIngredients) ? favoriteIngredients.filter(f => f.trim()) : [];
    
    // Social media
    if (socialMedia !== undefined) updates.socialMedia = socialMedia;
    
    // Settings
    if (privacySettings !== undefined) updates.privacySettings = privacySettings;
    if (notificationSettings !== undefined) updates.notificationSettings = notificationSettings;
    
    // Pro chef info
    if (isProChef !== undefined) updates.isProChef = isProChef;
    if (proChefInfo !== undefined) updates.proChefInfo = proChefInfo;

    // Update last active timestamp
    updates.lastActive = Date.now();

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const stats = await userService.getEnrichedUserStats(user._id);
    const userLevel = calculateUserLevel(stats);

    res.json({ 
      ...user.toObject(),
      ...stats,
      userLevel,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    console.error('Update profile error:', err);
    
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ 
        message: `${field} already exists`,
        code: `${field.toUpperCase()}_EXISTS`
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Upload Profile Picture - CLOUDINARY VERSION
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Update with Cloudinary URL
    user.profilePicture = req.file.path; // Cloudinary URL
    user.lastActive = Date.now();
    await user.save();

    const stats = await userService.getEnrichedUserStats(user._id);
    const userLevel = calculateUserLevel(stats);

    res.json({ 
      message: 'Profile picture updated successfully',
      profilePicture: req.file.path,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        profilePicture: req.file.path,
        ...stats,
        userLevel
      }
    });
  } catch (err) {
    console.error('❌ Upload profile picture error:', err);
    res.status(500).json({ 
      message: 'Failed to update profile picture',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
};

// Upload Cover Picture - CLOUDINARY VERSION
exports.uploadCoverPicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Update with Cloudinary URL
    user.coverPicture = req.file.path; // Cloudinary URL
    user.lastActive = Date.now();
    await user.save();

    const stats = await userService.getEnrichedUserStats(user._id);
    const userLevel = calculateUserLevel(stats);

    res.json({ 
      message: 'Cover picture updated successfully',
      coverPicture: req.file.path,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        coverPicture: req.file.path,
        ...stats,
        userLevel
      }
    });
  } catch (err) {
    console.error('❌ Upload cover picture error:', err);
    res.status(500).json({ 
      message: 'Failed to update cover picture',
      code: 'COVER_UPDATE_ERROR'
    });
  }
};
// Get User Badges
exports.getUserBadges = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const user = await User.findById(userId).select('badges');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json({ 
      badges: user.badges || [],
      message: 'Badges retrieved successfully'
    });
  } catch (err) {
    console.error('Get user badges error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Add Badge
exports.addBadge = async (req, res) => {
  try {
    const { badgeName, icon, description } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if badge already exists
    const existingBadge = user.badges.find(b => b.name === badgeName);
    if (existingBadge) {
      return res.status(400).json({ 
        message: 'Badge already earned',
        code: 'BADGE_EXISTS'
      });
    }
    
    const newBadge = {
      name: badgeName,
      icon: icon || '🏆',
      earnedAt: new Date(),
      description: description || ''
    };
    
    user.badges.push(newBadge);
    await user.save();
    
    res.json({ 
      message: 'Badge added successfully',
      badge: newBadge
    });
  } catch (err) {
    console.error('Add badge error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Get User Profile (for viewing other users)
exports.getUserProfile = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const userId = req.params.userId;

    const [user, currentUser] = await Promise.all([
      User.findById(userId)
        .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires')
        .populate('following', 'username profilePicture followersCount')
        .populate('followers', 'username profilePicture followersCount')
        .lean(),
      User.findById(currentUserId).select('following')
    ]);

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check privacy settings
    if (user.privacySettings?.profileVisibility === 'private' && user._id.toString() !== currentUserId) {
      return res.status(403).json({
        message: 'This profile is private',
        code: 'PRIVATE_PROFILE'
      });
    }

    const stats = await userService.getEnrichedUserStats(userId);
    const userLevel = calculateUserLevel(stats);
    const isFollowing = currentUser.following.includes(userId);

    res.json({ 
      ...user, 
      ...stats,
      userLevel,
      isFollowing
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Get Author Profile
exports.getAuthorProfile = async (req, res) => {
  try {
    const authorId = req.params.userId;
    const currentUserId = req.user?.id;

    const [author, recipes, stats] = await Promise.all([
      User.findById(authorId)
        .select('-password -email -resetPasswordToken -resetPasswordExpires')
        .lean(),
      Recipe.find({ author: authorId })
        .select('title description imageUrl mainImage images prepTime cookTime difficulty category tags rating likesCount viewsCount createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('author', 'username profilePicture')
        .lean(),
      userService.getEnrichedUserStats(authorId)
    ]);

    if (!author) {
      return res.status(404).json({ 
        message: 'Author not found',
        code: 'USER_NOT_FOUND'
      });
    }

    let isFollowing = false;
    if (currentUserId) {
      const currentUser = await User.findById(currentUserId);
      isFollowing = currentUser?.following?.includes(authorId) || false;
    }

    const userLevel = calculateUserLevel(stats);

    // Process recipes to ensure all fields are present
    const processedRecipes = recipes.map(recipe => {
      const imagePath = recipe.imageUrl || recipe.image || recipe.mainImage || 
                       (recipe.images && recipe.images.length > 0 ? recipe.images[0] : null);
      
      return {
        ...recipe,
        description: recipe.description || '',
        imageUrl: imagePath, 
        image: imagePath,
        prepTime: recipe.prepTime || 0,
        cookTime: recipe.cookTime || 0,
        difficulty: recipe.difficulty || 'Easy',
        category: recipe.category || 'Uncategorized',
        likesCount: recipe.likesCount || 0,
        rating: recipe.rating || 0,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt
      };
    });

    console.log('Author profile recipes processed:', processedRecipes.map(r => ({
      title: r.title,
      imageUrl: r.imageUrl,
      image: r.image
    })));

    res.json({
      ...author,
      ...stats,
      userLevel,
      recipes: processedRecipes,
      isFollowing,
      isOwnProfile: currentUserId === authorId
    });
  } catch (err) {
    console.error('Get author profile error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Toggle Follow - FIXED with proper notification handling
exports.toggleFollow = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({ 
        message: "You can't follow yourself",
        code: 'CANNOT_FOLLOW_SELF'
      });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(userId)
    ]);

    if (!targetUser) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const isFollowing = currentUser.following.includes(userId);
    
    if (isFollowing) {
      // Unfollow
      await Promise.all([
        User.findByIdAndUpdate(currentUserId, {
          $pull: { following: userId },
          $inc: { followingCount: -1 }
        }),
        User.findByIdAndUpdate(userId, {
          $pull: { followers: currentUserId },
          $inc: { followersCount: -1 }
        })
      ]);
    } else {
      // Follow
      await Promise.all([
        User.findByIdAndUpdate(currentUserId, {
          $addToSet: { following: userId },
          $inc: { followingCount: 1 }
        }),
        User.findByIdAndUpdate(userId, {
          $addToSet: { followers: currentUserId },
          $inc: { followersCount: 1 }
        })
      ]);
      
      // Send notification only when following (not unfollowing)
      try {
        // FIXED: Use only createFollowNotification (not createNewFollowerNotification)
        // Both were sending the same notification type
        await notificationController.createFollowNotification(currentUserId, userId);
        console.log('✅ Follow notification sent to:', userId);
      } catch (notificationError) {
        console.error('⚠️ Failed to create follow notification:', notificationError);
        // Don't fail follow operation if notification fails
      }
    }

    // Get updated counts from database
    const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
      User.findById(currentUserId).select('followingCount following'),
      User.findById(userId).select('followersCount followers')
    ]);

    res.json({ 
      isFollowing: !isFollowing,
      followersCount: updatedTargetUser.followersCount,
      followingCount: updatedCurrentUser.followingCount,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully'
    });
  } catch (err) {
    console.error('Toggle follow error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Get Followers
exports.getFollowers = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId)
      .select('followers')
      .populate({
        path: 'followers',
        select: 'username profilePicture bio followersCount',
        options: { limit, skip }
      });

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get total count
    const totalFollowers = await User.findById(userId).select('followers');

    res.json({
      followers: user.followers,
      page,
      limit,
      total: totalFollowers ? totalFollowers.followers.length : 0
    });
  } catch (err) {
    console.error('Get followers error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Get Following
exports.getFollowing = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId)
      .select('following')
      .populate({
        path: 'following',
        select: 'username profilePicture bio followersCount',
        options: { limit, skip }
      });

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get total count
    const totalFollowing = await User.findById(userId).select('following');

    res.json({
      following: user.following,
      page,
      limit,
      total: totalFollowing ? totalFollowing.following.length : 0
    });
  } catch (err) {
    console.error('Get following error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Get Saved Recipes
exports.getSavedRecipes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'savedRecipes',
        select: 'title description imageUrl prepTime cookTime servings difficulty category rating author',
        populate: {
          path: 'author',
          select: 'username profilePicture'
        }
      });

    res.json(user.savedRecipes || []);
  } catch (err) {
    console.error('Get saved recipes error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Get Favorite Recipes
exports.getFavoriteRecipes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'favorites',
        select: 'title description imageUrl prepTime cookTime servings difficulty category rating author',
        populate: {
          path: 'author',
          select: 'username profilePicture'
        }
      });

    res.json(user.favorites || []);
  } catch (err) {
    console.error('Get favorite recipes error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Get User Recipes
exports.getUserRecipes = async (req, res) => {
  try {
    const userId = req.params.userId;
    const recipes = await Recipe.find({ author: userId })
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 });

    res.json(recipes);
  } catch (err) {
    console.error('Get user recipes error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Get Chefs
exports.getChefs = async (req, res) => {
  try {
    const users = await User.find({})
      .select('username email profilePicture bio recipesCount followersCount isVerified createdAt specialty socialMedia')
      .sort({ recipesCount: -1, followersCount: -1, createdAt: -1 })
      .limit(50);

    const chefs = users.map(user => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      recipesCount: user.recipesCount || 0,
      followersCount: user.followersCount || 0,
      isVerified: user.isVerified || false,
      createdAt: user.createdAt,
      specialty: user.specialty,
      socialMedia: user.socialMedia || {}
    }));

    res.json({
      success: true,
      users: chefs,
      total: chefs.length
    });
  } catch (error) {
    console.error('Error fetching chefs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chefs',
      code: 'SERVER_ERROR'
    });
  }
};

// Get User Activity
exports.getUserActivity = async (req, res) => {
  try {
    // Return empty array for now - you can implement activity tracking later
    res.json([]);
  } catch (err) {
    console.error('Get user activity error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
}