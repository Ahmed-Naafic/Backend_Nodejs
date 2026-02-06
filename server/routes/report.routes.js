/**
 * Report Routes
 * Reporting endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const ReportService = require('../services/report.service');

/**
 * GET /api/reports
 * Get summary report (Default)
 */
router.get('/',
  authenticate,
  requirePermission('VIEW_REPORTS'),
  async (req, res) => {
    try {
      const report = await ReportService.getSummaryReport();

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/reports/summary
 * Get summary report
 */
router.get('/summary',
  authenticate,
  requirePermission('VIEW_REPORTS'),
  async (req, res) => {
    try {
      const report = await ReportService.getSummaryReport();

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/reports/citizens
 * Get citizen registration report
 */
router.get('/citizens',
  authenticate,
  requirePermission('VIEW_REPORTS'),
  async (req, res) => {
    try {
      const report = await ReportService.getCitizenReport(
        req.query.startDate,
        req.query.endDate
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/reports/registrations
 * Get registration statistics
 */
router.get('/registrations',
  authenticate,
  requirePermission('VIEW_REPORTS'),
  async (req, res) => {
    try {
      const stats = await ReportService.getRegistrationStats(
        req.query.startDate,
        req.query.endDate
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/reports/users
 * Get user activity report
 */
router.get('/users',
  authenticate,
  requirePermission('VIEW_REPORTS'),
  async (req, res) => {
    try {
      const report = await ReportService.getUserActivityReport();

      res.json({
        success: true,
        data: report
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
