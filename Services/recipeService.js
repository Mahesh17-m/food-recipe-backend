const Recipe = require('../models/Recipe');
const Review = require('../models/Review');

exports.calculateAverageRating = async (recipeId) => {
  const result = await Review.aggregate([
    { $match: { recipe: recipeId } },
    { $group: { _id: null, average: { $avg: '$rating' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].average * 10) / 10 : 0;
};