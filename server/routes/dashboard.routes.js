/**
 * Dashboard Routes
 * Dashboard statistics endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const DashboardService = require('../services/dashboard.service');

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats',
  authenticate,
  requirePermission('VIEW_DASHBOARD'),
  async (req, res) => {
    try {
      const stats = await DashboardService.getDashboardStats();

      res.json({
        success: true,
        stats
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
