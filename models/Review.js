const mongoose = require('mongoose');

if (mongoose.models.Review) {
  module.exports = mongoose.model('Review');
} else {
  const reviewSchema = new mongoose.Schema({
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    recipe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }, {
    timestamps: true
  });

  // Add index for better query performance
  reviewSchema.index({ recipe: 1, author: 1 });
  reviewSchema.index({ author: 1, createdAt: -1 });

  module.exports = mongoose.model('Review', reviewSchema);
}