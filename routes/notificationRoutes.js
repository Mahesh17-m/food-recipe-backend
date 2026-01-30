const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/authMiddleware');

// Get all notifications for current user
router.get('/', auth, notificationController.getNotifications);

// Mark single notification as read
router.patch('/:notificationId/read', auth, notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', auth, notificationController.markAllAsRead);

// Delete single notification
router.delete('/:notificationId', auth, notificationController.deleteNotification);

// Clear all notifications
router.delete('/', auth, notificationController.clearAllNotifications);

module.exports = router;