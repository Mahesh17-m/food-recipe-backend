const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper function to prevent duplicate notifications
const preventDuplicates = async (notificationData) => {
  const { recipient, type, sender, recipe } = notificationData;
  
  // Check for recent duplicate notification (within last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const duplicate = await Notification.findOne({
    recipient,
    type,
    ...(sender && { sender }),
    ...(recipe && { recipe }),
    createdAt: { $gte: fiveMinutesAgo }
  });
  
  return !duplicate; // Return true if no duplicate found
};

// Get all notifications for current user
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'username profilePicture name')
      .populate('recipe', 'title imageUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments({ recipient: req.user.id });
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id, 
      read: false 
    });

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ 
      message: 'Server error while fetching notifications',
      code: 'SERVER_ERROR'
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ 
        message: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.json({ 
      message: 'Notification marked as read',
      notification 
    });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );

    res.json({ 
      message: 'All notifications marked as read'
    });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ 
        message: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.json({ 
      message: 'Notification deleted successfully'
    });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Clear all notifications
exports.clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });

    res.json({ 
      message: 'All notifications cleared'
    });
  } catch (err) {
    console.error('Clear all notifications error:', err);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Notification Service Functions (to be called from other controllers)
exports.createNotification = async (notificationData) => {
  try {
    // Check for duplicates before creating
    const shouldCreate = await preventDuplicates(notificationData);
    
    if (!shouldCreate) {
      console.log('Duplicate notification prevented:', notificationData.type);
      return null;
    }

    const notification = new Notification(notificationData);
    await notification.save();
    
    // Populate before returning if needed
    return await Notification.findById(notification._id)
      .populate('sender', 'username profilePicture name')
      .populate('recipe', 'title imageUrl');
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// **FIXED: Welcome notification - make sure it works on registration**
exports.createWelcomeNotification = async (userId) => {
  try {
    console.log('🎉 Creating welcome notification for user:', userId);
    
    const notificationData = {
      recipient: userId,
      type: 'welcome',
      title: 'Welcome to Food Recipe App! 🎉',
      message: 'We\'re excited to have you here! Start exploring delicious recipes and share your culinary creations with the community.',
      read: false
    };
    
    // Save the notification
    const notification = new Notification(notificationData);
    await notification.save();
    
    console.log('✅ Welcome notification created for user:', userId);
    return notification;
  } catch (error) {
    console.error('❌ Error creating welcome notification:', error);
    return null;
  }
};

// **FIXED: Login notification - ensure it works**
exports.createLoginNotification = async (userId) => {
  try {
    console.log('🔐 Creating login notification for user:', userId);
    
    // Remove duplicate check for login notifications
    const notificationData = {
      recipient: userId,
      type: 'login',
      title: 'Welcome back, Chef! 👨‍🍳',
      message: 'Good to see you again! Ready to cook something amazing today?',
      read: false
    };
    
    // Save the notification
    const notification = new Notification(notificationData);
    await notification.save();
    
    console.log('✅ Login notification created for user:', userId);
    return notification;
  } catch (error) {
    console.error('❌ Error creating login notification:', error);
    return null;
  }
};

// Other notification functions remain the same...
exports.createFollowNotification = async (followerId, followingId) => {
  try {
    console.log('👥 Creating follow notification:', { followerId, followingId });
    const follower = await User.findById(followerId).select('username name');
    if (!follower) {
      console.error('Follower not found:', followerId);
      return null;
    }
    
    const notificationData = {
      recipient: followingId,
      sender: followerId,
      type: 'follow',
      title: 'New Follower! 👥',
      message: `${follower.username} started following you`,
      read: false
    };
  
    const shouldCreate = await preventDuplicates(notificationData);
    
    if (shouldCreate) {
      const notification = new Notification(notificationData);
      await notification.save();
      console.log('✅ Follow notification created');
      return notification;
    } else {
      console.log('⚠️ Follow notification not created (duplicate prevented)');
      return null;
    }
  } catch (error) {
    console.error('Error creating follow notification:', error);
    return null;
  }
};

exports.createRecipeAddedNotification = async (userId, recipeId, recipeTitle) => {
  try {
    console.log('📝 Creating recipe added notification:', { userId, recipeId, recipeTitle });
    
    const notificationData = {
      recipient: userId,
      type: 'recipe_added',
      title: 'Recipe Published! 📝',
      message: `Your recipe "${recipeTitle}" has been published and is now available for others to discover and enjoy!`,
      recipe: recipeId,
      read: false
    };
  
    const shouldCreate = await preventDuplicates(notificationData);
    
    if (shouldCreate) {
      const notification = new Notification(notificationData);
      await notification.save();
      console.log('✅ Recipe added notification created');
      return notification;
    } else {
      console.log('⚠️ Recipe added notification not created (duplicate prevented)');
      return null;
    }
  } catch (error) {
    console.error('Error creating recipe added notification:', error);
    return null;
  }
};

exports.createRecipeLikedNotification = async (likerId, recipeOwnerId, recipeId, recipeTitle) => {
  try {
    console.log('❤️ Creating recipe liked notification:', { likerId, recipeOwnerId, recipeId, recipeTitle });
    
    const liker = await User.findById(likerId).select('username name');
    if (!liker) {
      console.error('Liker not found:', likerId);
      return null;
    }
  
    const notificationData = {
      recipient: recipeOwnerId,
      sender: likerId,
      type: 'recipe_liked',
      title: 'Your Recipe Got a Like! ❤️',
      message: `${liker.username} liked your recipe "${recipeTitle}"`,
      recipe: recipeId,
      read: false
    };
  
    const shouldCreate = await preventDuplicates(notificationData);
    
    if (shouldCreate) {
      const notification = new Notification(notificationData);
      await notification.save();
      console.log('✅ Recipe liked notification created');
      return notification;
    } else {
      console.log('⚠️ Recipe liked notification not created (duplicate prevented)');
      return null;
    }
  } catch (error) {
    console.error('Error creating recipe liked notification:', error);
    return null;
  }
};

exports.createRecipeSavedNotification = async (saverId, recipeOwnerId, recipeId, recipeTitle) => {
  try {
    console.log('📌 Creating recipe saved notification:', { saverId, recipeOwnerId, recipeId, recipeTitle });
    
    const saver = await User.findById(saverId).select('username name');
    if (!saver) {
      console.error('Saver not found:', saverId);
      return null;
    }
  
    const notificationData = {
      recipient: recipeOwnerId,
      sender: saverId,
      type: 'recipe_saved',
      title: 'Recipe Saved! 📌',
      message: `${saver.username} saved your recipe "${recipeTitle}" to their collection`,
      recipe: recipeId,
      read: false
    };
  
    const shouldCreate = await preventDuplicates(notificationData);
    
    if (shouldCreate) {
      const notification = new Notification(notificationData);
      await notification.save();
      console.log('✅ Recipe saved notification created');
      return notification;
    } else {
      console.log('⚠️ Recipe saved notification not created (duplicate prevented)');
      return null;
    }
  } catch (error) {
    console.error('Error creating recipe saved notification:', error);
    return null;
  }
};

exports.createReviewAddedNotification = async (reviewerId, recipeOwnerId, recipeId, recipeTitle) => {
  try {
    console.log('⭐ Creating review added notification:', { reviewerId, recipeOwnerId, recipeId, recipeTitle });
    
    const reviewer = await User.findById(reviewerId).select('username name');
    if (!reviewer) {
      console.error('Reviewer not found:', reviewerId);
      return null;
    }
  
    const notificationData = {
      recipient: recipeOwnerId,
      sender: reviewerId,
      type: 'review_added',
      title: 'New Review! ⭐',
      message: `${reviewer.username} left a review on your recipe "${recipeTitle}"`,
      recipe: recipeId,
      read: false
    };
  
    const shouldCreate = await preventDuplicates(notificationData);
    
    if (shouldCreate) {
      const notification = new Notification(notificationData);
      await notification.save();
      console.log('✅ Review added notification created');
      return notification;
    } else {
      console.log('⚠️ Review added notification not created (duplicate prevented)');
      return null;
    }
  } catch (error) {
    console.error('Error creating review notification:', error);
    return null;
  }
};

exports.createNewFollowerNotification = async (newFollowerId, userId) => {
  try {
    console.log('🎉 Creating new follower notification:', { newFollowerId, userId });
    
    const newFollower = await User.findById(newFollowerId).select('username name');
    if (!newFollower) {
      console.error('New follower not found:', newFollowerId);
      return null;
    }
  
    const notificationData = {
      recipient: userId,
      sender: newFollowerId,
      type: 'new_follower',
      title: 'New Follower! 🎉',
      message: `${newFollower.username} is now following you`,
      read: false
    };
  
    const shouldCreate = await preventDuplicates(notificationData);
    
    if (shouldCreate) {
      const notification = new Notification(notificationData);
      await notification.save();
      console.log('✅ New follower notification created');
      return notification;
    } else {
      console.log('⚠️ New follower notification not created (duplicate prevented)');
      return null;
    }
  } catch (error) {
    console.error('Error creating new follower notification:', error);
    return null;
  }
};

exports.createAchievementNotification = async (userId, achievement) => {
  try {
    console.log('🏆 Creating achievement notification:', { userId, achievement });
    
    const notificationData = {
      recipient: userId,
      type: 'achievement',
      title: 'Achievement Unlocked! 🏆',
      message: achievement,
      read: false
    };
  
    const shouldCreate = await preventDuplicates(notificationData);
    
    if (shouldCreate) {
      const notification = new Notification(notificationData);
      await notification.save();
      console.log('✅ Achievement notification created');
      return notification;
    } else {
      console.log('⚠️ Achievement notification not created (duplicate prevented)');
      return null;
    }
  } catch (error) {
    console.error('Error creating achievement notification:', error);
    return null;
  }
};

// Add test endpoint to debug notifications
exports.testWelcomeNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🧪 Testing welcome notification for user:', userId);
    
    const notification = await exports.createWelcomeNotification(userId);
    
    if (notification) {
      res.json({ 
        success: true,
        message: 'Test welcome notification created successfully',
        notification 
      });
    } else {
      res.json({ 
        success: false,
        message: 'Welcome notification not created (possible duplicate)' 
      });
    }
  } catch (err) {
    console.error('Test welcome notification error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

exports.testLoginNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🧪 Testing login notification for user:', userId);
    
    const notification = await exports.createLoginNotification(userId);
    
    if (notification) {
      res.json({ 
        success: true,
        message: 'Test login notification created successfully',
        notification 
      });
    } else {
      res.json({ 
        success: false,
        message: 'Login notification not created (possible duplicate or already exists today)' 
      });
    }
  } catch (err) {
    console.error('Test login notification error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};