/**
 * User Routes
 * All user management endpoints
 */

const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const UserService = require('../services/user.service');
const ActivityService = require('../services/activity.service');
const { uploadProfilePicture, getFileUrl } = require('../utils/fileUpload.util');
const multer = require('multer');

// Multer for profile picture upload
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/profiles',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = require('path').extname(file.originalname);
      cb(null, `${req.userId || 'user'}_${uniqueSuffix}${ext}`);
    }
  })
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/',
  authenticate,
  requirePermission('MANAGE_USERS'),
  upload.single('profilePicture'),
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role_id').notEmpty().withMessage('Role ID is required')
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

      const userData = {
        ...req.body,
        profilePicturePath: req.file ? req.file.path : null
      };

      const user = await UserService.createUser(userData);

      // Log activity
      await ActivityService.logActivity(
        req.userId,
        'CREATE_USER',
        'user',
        user.id,
        `Created user: ${user.username}`,
        req.ip,
        req.get('user-agent')
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
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
 * GET /api/users
 * List all users
 */
router.get('/',
  authenticate,
  requirePermission('MANAGE_USERS'),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      const result = await UserService.listUsers(page, limit);

      res.json({
        success: true,
        ...result
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
 * GET /api/users/roles
 * Get all roles
 */
router.get('/roles',
  authenticate,
  // requirePermission('MANAGE_USERS'), // Relaxed permission for dropdown population
  async (req, res) => {
    try {
      const roles = await UserService.getRoles();

      res.json({
        success: true,
        data: roles
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
 * GET /api/users/trash
 * List deleted users
 */
router.get('/trash',
  authenticate,
  requirePermission('MANAGE_USERS'),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      const result = await UserService.listTrash(page, limit);

      res.json({
        success: true,
        ...result
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
 * POST /api/users/trash/:id/restore
 * Restore user from trash
 */
router.post('/trash/:id/restore',
  authenticate,
  requirePermission('MANAGE_USERS'),
  async (req, res) => {
    try {
      const user = await UserService.restoreUser(req.params.id);

      res.json({
        success: true,
        message: 'User restored successfully',
        data: user
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
 * DELETE /api/users/trash/:id
 * Permanently delete user
 */
router.delete('/trash/:id',
  authenticate,
  requirePermission('MANAGE_USERS'),
  async (req, res) => {
    try {
      await UserService.deleteUserPermanent(req.params.id);

      res.json({
        success: true,
        message: 'User permanently deleted'
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
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id',
  authenticate,
  requirePermission('MANAGE_USERS'),
  async (req, res) => {
    try {
      const user = await UserService.getUserById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
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
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id',
  authenticate,
  requirePermission('MANAGE_USERS'),
  upload.single('profilePicture'),
  async (req, res) => {
    try {
      const updateData = { ...req.body };

      if (req.file) {
        // Delete old profile picture if exists
        const oldUser = await UserService.getUserById(req.params.id);
        if (oldUser?.profilePicturePath) {
          const fs = require('fs');
          if (fs.existsSync(oldUser.profilePicturePath)) {
            fs.unlinkSync(oldUser.profilePicturePath);
          }
        }
        updateData.profilePicturePath = req.file.path;
      }

      const user = await UserService.updateUser(req.params.id, updateData);

      // Log activity
      await ActivityService.logActivity(
        req.userId,
        'UPDATE_USER',
        'user',
        user.id,
        `Updated user: ${user.username}`,
        req.ip,
        req.get('user-agent')
      );

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
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
 * DELETE /api/users/:id
 * Soft delete user
 */
router.delete('/:id',
  authenticate,
  requirePermission('MANAGE_USERS'),
  async (req, res) => {
    try {
      await UserService.deleteUser(req.params.id);

      // Log activity
      await ActivityService.logActivity(
        req.userId,
        'DELETE_USER',
        'user',
        req.params.id,
        `Deleted user: ${req.params.id}`,
        req.ip,
        req.get('user-agent')
      );

      res.json({
        success: true,
        message: 'User deleted successfully'
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
 * POST /api/users/:id/status
 * Change user status
 */
router.post('/:id/status',
  authenticate,
  requirePermission('MANAGE_USERS'),
  [
    body('status').isIn(['ACTIVE', 'DISABLED']).withMessage('Status must be ACTIVE or DISABLED')
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

      const user = await UserService.changeUserStatus(req.params.id, req.body.status);

      res.json({
        success: true,
        message: 'User status updated successfully',
        data: user
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
 * POST /api/users/:id/reset-password
 * Reset user password
 */
router.post('/:id/reset-password',
  authenticate,
  requirePermission('MANAGE_USERS'),
  [
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

      await UserService.updateUserPassword(req.params.id, req.body.newPassword);

      // Log activity
      await ActivityService.logActivity(
        req.userId,
        'RESET_PASSWORD',
        'user',
        req.params.id,
        `Reset password for user: ${req.params.id}`,
        req.ip,
        req.get('user-agent')
      );

      res.json({
        success: true,
        message: 'Password reset successfully'
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
