const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  type: { 
    type: String, 
    enum: [
      'welcome',
      'login',
      'follow',
      'recipe_added',
      'recipe_liked', 
      'recipe_saved',
      'review_added',
      'comment_added',
      'new_follower',
      'recipe_featured',
      'achievement'
    ], 
    required: true 
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  recipe: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Recipe' 
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Index for better performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);