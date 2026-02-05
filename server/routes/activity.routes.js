/**
 * Activity Routes
 * System activity logging endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const ActivityService = require('../services/activity.service');

/**
 * GET /api/activities/recent
 * Get recent system activities
 */
router.get('/recent',
  authenticate,
  requirePermission('VIEW_ACTIVITIES'),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const activities = await ActivityService.getRecentActivities(limit);

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;
