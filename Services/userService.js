const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const Review = require('../models/Review');
const User = require('../models/User');

exports.calculateUserStats = async (userId) => {
  try {
    console.log('📊 Calculating COMPLETE user stats for:', userId);
    
    // Get user first to access basic info
    const user = await User.findById(userId).lean();
    
    if (!user) {
      return this.getDefaultStats();
    }

    // Calculate ALL stats in parallel with better aggregation
    const [
      recipeCount,
      favoriteCount,
      reviewCount,
      totalLikesFromRecipes,
      totalViewsFromRecipes,
      savedRecipesCount,
      savedRecipesList,
      favoritesList
    ] = await Promise.all([
      // Recipe count
      Recipe.countDocuments({ author: userId }),
      
      // Favorite recipes count (recipes where user has favorited)
      Recipe.countDocuments({ favorites: userId }),
      
      // Review count
      Review.countDocuments({ author: userId }),
      
      // Total likes from recipes (sum of likes array length)
      Recipe.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(userId) } },
        { $project: { likesCount: { $size: { $ifNull: ["$likes", []] } } } },
        { $group: { _id: null, totalLikes: { $sum: "$likesCount" } } }
      ]),
      
      // Total views from recipes (sum of views)
      Recipe.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, totalViews: { $sum: { $ifNull: ["$views", 0] } } } }
      ]),
      
      // Saved recipes count from user model
      User.findById(userId).select('savedRecipes').then(user => user?.savedRecipes?.length || 0),
      
      // Get saved recipes for response
      User.findById(userId).select('savedRecipes').populate('savedRecipes', 'title imageUrl rating').lean(),
      
      // Get favorites for response
      User.findById(userId).select('favorites').populate('favorites', 'title imageUrl rating').lean()
    ]);

    // Extract values from aggregation results
    const totalLikes = totalLikesFromRecipes.length > 0 ? totalLikesFromRecipes[0].totalLikes : 0;
    const totalViews = totalViewsFromRecipes.length > 0 ? totalViewsFromRecipes[0].totalViews : 0;
    
    // Get followers/following counts - ensure we use actual array lengths
    const followersCount = user.followers ? user.followers.length : (user.followersCount || 0);
    const followingCount = user.following ? user.following.length : (user.followingCount || 0);
    
    // Calculate engagement rate
    let engagementRate = 0;
    if (followersCount > 0) {
      engagementRate = ((totalLikes + totalViews) / followersCount) * 100;
    }

    // Update user document with accurate counts
    const updates = {
      recipesCount: recipeCount,
      favoritesCount: favoriteCount,
      reviewsCount: reviewCount,
      totalLikes: totalLikes,
      totalViews: totalViews,
      followersCount: followersCount,
      followingCount: followingCount
    };

    await User.findByIdAndUpdate(userId, { $set: updates });

    console.log(`✅ COMPLETE Stats calculated for user ${userId}: 
      Recipes: ${recipeCount}
      Favorites: ${favoriteCount}
      Reviews: ${reviewCount}
      Saved Recipes: ${savedRecipesCount}
      Followers: ${followersCount}
      Following: ${followingCount}
      Likes: ${totalLikes}
      Views: ${totalViews}
      Engagement: ${engagementRate.toFixed(1)}%`);
    
    return {
      recipesCount: recipeCount,
      favoritesCount: favoriteCount,
      reviewsCount: reviewCount,
      savedRecipesCount: savedRecipesCount,
      followersCount: followersCount,
      followingCount: followingCount,
      totalLikes: totalLikes,
      totalViews: totalViews,
      totalInteractions: totalLikes + totalViews,
      engagementRate: parseFloat(engagementRate.toFixed(1)),
      savedRecipes: savedRecipesList?.savedRecipes || [],
      favorites: favoritesList?.favorites || []
    };
  } catch (error) {
    console.error('❌ Error calculating user stats:', error);
    return this.getDefaultStats();
  }
};

exports.getDefaultStats = () => {
  return {
    recipesCount: 0,
    favoritesCount: 0,
    reviewsCount: 0,
    savedRecipesCount: 0, // ADD THIS
    followersCount: 0,
    followingCount: 0,
    totalLikes: 0,
    totalViews: 0,
    totalInteractions: 0,
    engagementRate: 0,
    savedRecipes: [],
    favorites: []
  };
};

exports.getEnrichedUserStats = async (userId) => {
  try {
    console.log('🎯 Getting ENRICHED stats for user:', userId);
    
    // Get complete user data with all populated fields
    const user = await User.findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('savedRecipes', 'title imageUrl rating createdAt')
      .populate('favorites', 'title imageUrl rating createdAt')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture')
      .lean();
    
    if (!user) {
      return {
        ...this.getDefaultStats(),
        recentRecipes: [],
        recentReviews: [],
        username: '',
        profilePicture: '',
        coverPicture: ''
      };
    }
    
    // Calculate saved recipes count
    const savedRecipesCount = user.savedRecipes ? user.savedRecipes.length : 0;
    
    // Calculate basic stats
    const basicStats = await this.calculateUserStats(userId);
    
    // Get recent data
    const [recentRecipes, recentReviews] = await Promise.all([
      Recipe.find({ author: userId })
        .select('title imageUrl rating createdAt views likes')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Review.find({ author: userId })
        .select('rating comment recipe createdAt')
        .populate({
          path: 'recipe',
          select: 'title',
          strictPopulate: false
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    // Process recent reviews
    const processedReviews = (recentReviews || []).map(review => ({
      ...review,
      recipeId: review.recipe ? review.recipe._id : review.recipeId
    }));

    // Combine all data - MAKE SURE TO INCLUDE savedRecipesCount
    const enrichedStats = {
      ...basicStats,
      savedRecipesCount: savedRecipesCount, // ADD THIS
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      coverPicture: user.coverPicture,
      bio: user.bio,
      location: user.location,
      website: user.website,
      cookingStyle: user.cookingStyle,
      socialMedia: user.socialMedia || {},
      interests: user.interests || [],
      specialties: user.specialties || [],
      isVerified: user.isVerified || false,
      isProChef: user.isProChef || false,
      proChefInfo: user.proChefInfo,
      memberSince: user.memberSince,
      lastActive: user.lastActive,
      recentRecipes: recentRecipes || [],
      recentReviews: processedReviews || [],
      // Ensure arrays are included
      savedRecipes: user.savedRecipes || [],
      favorites: user.favorites || [],
      followers: user.followers || [],
      following: user.following || [],
      badges: user.badges || []
    };

    console.log('✅ ENRICHED stats calculated successfully for user:', userId);
    console.log('Complete Stats Response:', {
      id: enrichedStats._id,
      coverPicture: enrichedStats.coverPicture,
      savedRecipesCount: enrichedStats.savedRecipesCount, // Log this
      recipes: enrichedStats.recipesCount,
      favorites: enrichedStats.favoritesCount,
      saved: enrichedStats.savedRecipesCount,
      followers: enrichedStats.followersCount,
      following: enrichedStats.followingCount,
      likes: enrichedStats.totalLikes,
      views: enrichedStats.totalViews,
      engagement: enrichedStats.engagementRate
    });
    
    return enrichedStats;
  } catch (error) {
    console.error('❌ Error getting enriched stats:', error);
    return {
      ...this.getDefaultStats(),
      savedRecipesCount: 0, // ADD THIS
      recentRecipes: [],
      recentReviews: [],
      username: '',
      profilePicture: '',
      coverPicture: ''
    };
  }
};