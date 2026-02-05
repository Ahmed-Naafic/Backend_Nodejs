/**
 * User Service
 * Business logic for user management operations
 */

const User = require('../models/User.model');
const Role = require('../models/Role.model');
const mongoose = require('mongoose');

class UserService {
  /**
   * Get all roles
   */
  static async getRoles() {
    return await Role.find({}, 'name description')
      .sort({ name: 1 });
  }

  /**
   * Create a new user
   */
  static async createUser(data) {
    // Validate required fields
    if (!data.username || !data.username.trim()) {
      throw new Error('Username is required');
    }

    if (!data.password || !data.password.trim()) {
      throw new Error('Password is required');
    }

    if (!data.role_id && !data.roleId) {
      throw new Error('Role ID is required');
    }

    const username = data.username.trim();
    const password = data.password;
    const roleId = data.role_id || data.roleId;

    // Validate username length
    if (username.length < 3 || username.length > 100) {
      throw new Error('Username must be between 3 and 100 characters');
    }

    // Validate password length
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error('Invalid role ID');
    }

    // Check if username already exists (excluding deleted users)
    const existingUser = await User.findOne({
      username,
      deletedAt: null
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Validate phone number if provided
    if (data.phoneNumber && !/^[+]?[0-9]{8,15}$/.test(data.phoneNumber.trim())) {
      throw new Error('Invalid phone number format. Use 8-15 digits with optional country code');
    }

    // Create user (password will be hashed by pre-save hook)
    const user = new User({
      username,
      password,
      roleId,
      role: role.name,
      status: data.status || 'ACTIVE',
      phoneNumber: data.phoneNumber?.trim() || null,
      profilePicturePath: data.profilePicturePath || null
    });

    await user.save();
    return this.normalizeUser(user);
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    const user = await User.findById(userId)
      .populate('roleId')
      .select('-password');

    if (!user || user.deletedAt) {
      return null;
    }

    return this.normalizeUser(user);
  }

  /**
   * List all users
   */
  static async listUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ deletedAt: null })
        .populate('roleId')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ deletedAt: null })
    ]);

    return {
      data: users.map(u => this.normalizeUser(u)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update user
   */
  static async updateUser(userId, data) {
    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }

    // Update allowed fields
    if (data.role_id || data.roleId || data.roleName) {
      let role;

      // Try to find role by ID first
      if (data.role_id || data.roleId) {
        const roleId = data.role_id || data.roleId;
        // Check if it's a valid ObjectId format
        if (mongoose.Types.ObjectId.isValid(roleId)) {
          role = await Role.findById(roleId);
        }

        // If not found by ID, try to find by name (for hardcoded IDs like "1", "2", "3")
        if (!role && (roleId === '1' || roleId === '2' || roleId === '3')) {
          const roleNames = { '1': 'ADMIN', '2': 'OFFICER', '3': 'VIEWER' };
          role = await Role.findOne({ name: roleNames[roleId] });
        }
      }

      // If still not found, try by role name
      if (!role && data.roleName) {
        role = await Role.findOne({ name: data.roleName.toUpperCase() });
      }

      if (!role) {
        throw new Error('Invalid role ID or name');
      }

      // PREVENT ADMIN ROLE CHANGE
      if (user.role === 'ADMIN' && role.name !== 'ADMIN') {
        throw new Error('Cannot change role of an Admin user');
      }

      user.roleId = role._id;
      user.role = role.name;
    }

    if (data.status) {
      user.status = data.status.toUpperCase();
    }

    if (data.phoneNumber !== undefined) {
      if (data.phoneNumber && !/^[+]?[0-9]{8,15}$/.test(data.phoneNumber.trim())) {
        throw new Error('Invalid phone number format');
      }
      user.phoneNumber = data.phoneNumber?.trim() || null;
    }

    if (data.profilePicturePath !== undefined) {
      user.profilePicturePath = data.profilePicturePath || null;
    }

    await user.save();
    return this.normalizeUser(user);
  }

  /**
   * Update user password
   */
  static async updateUserPassword(userId, newPassword) {
    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    return true;
  }

  /**
   * Change user status
   */
  static async changeUserStatus(userId, status) {
    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }

    user.status = status.toUpperCase();
    await user.save();

    return this.normalizeUser(user);
  }

  /**
   * Soft delete user
   */
  static async deleteUser(userId) {
    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }

    user.deletedAt = new Date();
    await user.save();

    return true;
  }

  /**
   * Restore user from trash
   */
  static async restoreUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.deletedAt = null;
    await user.save();

    return this.normalizeUser(user);
  }

  /**
   * Permanently delete user
   */
  static async deleteUserPermanent(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await User.deleteOne({ _id: userId });
    return true;
  }

  /**
   * List deleted users (trash)
   */
  static async listTrash(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ deletedAt: { $ne: null } })
        .populate('roleId')
        .select('-password')
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ deletedAt: { $ne: null } })
    ]);

    return {
      data: users.map(u => this.normalizeUser(u)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Normalize user data for API response
   */
  static normalizeUser(user) {
    const { getFileUrl } = require('../utils/fileUpload.util');

    const normalized = {
      id: user._id.toString(),
      username: user.username,
      roleId: user.roleId?._id?.toString() || user.roleId?.toString(),
      role: user.roleId?.name || user.role || null,
      status: user.status,
      phoneNumber: user.phoneNumber,
      profilePicturePath: user.profilePicturePath,
      profilePictureUrl: user.profilePicturePath ? getFileUrl(user.profilePicturePath) : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    if (user.roleId && user.roleId.name) {
      normalized.role = {
        id: user.roleId._id.toString(),
        name: user.roleId.name,
        description: user.roleId.description
      };
    }

    return normalized;
  }
}

module.exports = UserService;
