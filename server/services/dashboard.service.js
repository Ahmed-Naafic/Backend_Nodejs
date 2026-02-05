/**
 * Dashboard Service
 * Provides dashboard statistics
 */

const Citizen = require('../models/Citizen.model');
const User = require('../models/User.model');
const Activity = require('../models/Activity.model');

class DashboardService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats() {
    try {
      const [totalCitizens, activeCitizens, totalUsers, activeUsers, recentActivities] = await Promise.all([
        Citizen.countDocuments({ deletedAt: null }),
        Citizen.countDocuments({ deletedAt: null, status: 'ACTIVE' }),
        User.countDocuments({ deletedAt: null }),
        User.countDocuments({ deletedAt: null, status: 'ACTIVE' }),
        Activity.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
      ]);

      return {
        totalCitizens,
        activeCitizens,
        deceasedCitizens: totalCitizens - activeCitizens,
        totalUsers,
        activeUsers,
        disabledUsers: totalUsers - activeUsers,
        recentActivities
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }
}

module.exports = DashboardService;
