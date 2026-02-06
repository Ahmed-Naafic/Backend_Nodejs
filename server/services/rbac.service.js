/**
 * RBAC Service
 * Role-Based Access Control functionality
 */

const Role = require('../models/Role.model');
const Permission = require('../models/Permission.model');
const Menu = require('../models/Menu.model');
const User = require('../models/User.model');

class RBACService {
  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId) {
    try {
      const user = await User.findById(userId).populate({
        path: 'roleId',
        populate: { path: 'permissions' }
      });

      if (!user || !user.roleId) {
        return [];
      }

      const permissions = user.roleId.permissions.map(p => p.code);
      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Get all menus accessible to a user
   */
  static async getUserMenus(userId) {
    try {
      const permissions = await this.getUserPermissions(userId);
      
      if (permissions.length === 0) {
        return [];
      }

      const menus = await Menu.find({
        $or: [
          { permissionCode: { $in: permissions } },
          { permissionCode: null } // Menus without permission requirement
        ]
      }).sort({ orderIndex: 1 });

      // Build menu tree
      return this.buildMenuTree(menus);
    } catch (error) {
      console.error('Error getting user menus:', error);
      return [];
    }
  }

  /**
   * Build hierarchical menu tree
   */
  static buildMenuTree(menus) {
    const menuMap = new Map();
    const rootMenus = [];

    // First pass: create menu map
    // Use 'label' to match PHP/MySQL database structure (like React frontend expects)
    menus.forEach(menu => {
      menuMap.set(menu._id.toString(), {
        id: menu._id.toString(),
        label: menu.name, // Map MongoDB 'name' to 'label' to match PHP database format
        route: menu.route,
        icon: menu.icon,
        orderIndex: menu.orderIndex,
        children: []
      });
    });

    // Second pass: build tree
    menus.forEach(menu => {
      const menuItem = menuMap.get(menu._id.toString());
      
      if (menu.parentId) {
        const parent = menuMap.get(menu.parentId.toString());
        if (parent) {
          parent.children.push(menuItem);
        }
      } else {
        rootMenus.push(menuItem);
      }
    });

    // Sort root menus and children
    rootMenus.sort((a, b) => a.orderIndex - b.orderIndex);
    rootMenus.forEach(menu => {
      menu.children.sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return rootMenus;
  }

  /**
   * Get user role
   */
  static async getUserRole(userId) {
    try {
      const user = await User.findById(userId).populate('roleId');
      if (!user || !user.roleId) {
        return null;
      }

      return {
        id: user.roleId._id.toString(),
        name: user.roleId.name,
        description: user.roleId.description
      };
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }
}

module.exports = RBACService;
