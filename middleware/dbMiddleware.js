const mongoose = require('mongoose');

module.exports = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.error('Database connection not ready. State:', mongoose.connection.readyState);
    return res.status(503).json({
      message: 'Database connection not established',
      dbState: mongoose.connection.readyState
    });
  }
  next();
};