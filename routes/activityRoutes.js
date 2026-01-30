const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { auth } = require('../middleware/authMiddleware'); // ✅ pick the function

router.get('/', auth, activityController.getActivities);
router.post('/', auth, activityController.createActivity);

module.exports = router;
