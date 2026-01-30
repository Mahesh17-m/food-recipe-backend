const Activity = require('../models/Activity');

exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const activity = new Activity({
      userId: req.user.id,
      message: req.body.message
    });
    await activity.save();
    res.json(activity);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};