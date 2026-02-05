/**
 * Authentication Routes
 * POST /api/auth/login - User login
 * POST /api/auth/logout - User logout
 * GET /api/auth/me - Get current user info
 * POST /api/auth/refresh - Refresh access token
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User.model');
const Role = require('../models/Role.model');
const { authenticate } = require('../middleware/auth.middleware');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt.util');
const ActivityService = require('../services/activity.service');
const RBACService = require('../services/rbac.service');

/**
 * POST /api/auth/login
 * User login with username and password
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { username, password, rememberMe } = req.body;

    // Find user (including checking for deleted status later)
    const user = await User.findOne({
      username: username.trim()
    }).populate('roleId');

    if (!user || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'user is not exist'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect username or password. Please make sure your credentials are correct.'
      });
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'you are disabled you cannot login'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Log activity
    await ActivityService.logActivity(
      user._id,
      'LOGIN',
      'auth',
      null,
      `User logged in: ${user.username}`,
      req.ip,
      req.get('user-agent')
    );

    // Get user permissions and menus using RBAC service
    const permissions = await RBACService.getUserPermissions(user._id.toString());
    const menus = await RBACService.getUserMenus(user._id.toString());

    // Get role info
    const role = await Role.findById(user.roleId);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          username: user.username,
          phoneNumber: user.phoneNumber,
          profilePictureUrl: user.profilePicturePath,
          role: role ? {
            id: role._id,
            name: role.name,
            description: role.description
          } : null,
          status: user.status
        },
        permissions,
        menus
      },
      sessionExpiresAt: Date.now() + (parseInt(process.env.SESSION_TIMEOUT) * 1000 || 300000),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 300
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed: ' + error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information, permissions, and menus
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('roleId')
      .select('-password');

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Get permissions and menus using RBAC service
    const permissions = await RBACService.getUserPermissions(user._id.toString());
    const menus = await RBACService.getUserMenus(user._id.toString());

    // Get role info (user.roleId is populated)
    const role = user.roleId;

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        phoneNumber: user.phoneNumber,
        profilePictureUrl: user.profilePicturePath,
        role: role ? {
          id: role._id,
          name: role.name,
          description: role.description
        } : null,
        status: user.status
      },
      permissions,
      menus,
      sessionExpiresAt: Date.now() + (parseInt(process.env.SESSION_TIMEOUT) * 1000 || 300000),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 300
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user information'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const { refreshToken } = req.body;
    const { verifyToken } = require('../utils/jwt.util');

    const decoded = verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const accessToken = generateAccessToken(user._id.toString());

    res.json({
      success: true,
      accessToken
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
});

/**
 * POST /api/auth/logout
 * User logout (client-side token removal, server-side activity log)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Log activity
    await ActivityService.logActivity(
      req.userId,
      'LOGOUT',
      'auth',
      null,
      `User logged out: ${req.user.username}`,
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

module.exports = router;
