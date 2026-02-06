/**
 * Notice Routes
 * System notices endpoints
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const NoticeService = require('../services/notice.service');

/**
 * GET /api/notices
 * Get all active notices
 */
router.get('/',
  authenticate,
  async (req, res) => {
    try {
      const notices = await NoticeService.getActiveNotices();

      res.json({
        success: true,
        data: notices
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
 * POST /api/notices
 * Create a notice
 */
router.post('/',
  authenticate,
  requirePermission('MANAGE_NOTICES'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const notice = await NoticeService.createNotice(req.body, req.userId);

      res.status(201).json({
        success: true,
        message: 'Notice created successfully',
        data: notice
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/notices/:id
 * Delete a notice
 */
router.delete('/:id',
  authenticate,
  requirePermission('MANAGE_NOTICES'),
  async (req, res) => {
    try {
      await NoticeService.deleteNotice(req.params.id);

      res.json({
        success: true,
        message: 'Notice deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;
