/**
 * Permission Middleware
 * RBAC-based permission checking
 */

const Permission = require('../models/Permission.model');
const Role = require('../models/Role.model');

/**
 * Require specific permission(s)
 */
const requirePermission = (...permissionCodes) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user's role
      const role = await Role.findById(req.user.roleId).populate('permissions');
      
      if (!role) {
        return res.status(403).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Get permission codes for this role
      const userPermissions = role.permissions.map(p => p.code);

      // Check if user has any of the required permissions
      const hasPermission = permissionCodes.some(code => 
        userPermissions.includes(code)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Permission check error'
      });
    }
  };
};

module.exports = {
  requirePermission
};
