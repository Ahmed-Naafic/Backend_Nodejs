/**
 * Activity Service
 * Handles system activity logging
 */

const Activity = require('../models/Activity.model');

class ActivityService {
  /**
   * Log a system activity
   */
  static async logActivity(userId, action, entityType, entityId, description, ipAddress = null, userAgent = null) {
    try {
      const activity = new Activity({
        userId,
        action,
        entityType,
        entityId,
        description,
        ipAddress,
        userAgent
      });

      await activity.save();
      return activity;
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw - activity logging should not break the main flow
      return null;
    }
  }

  /**
   * Get recent activities
   */
  static async getRecentActivities(limit = 20) {
    try {
      const activities = await Activity.find()
        .populate('userId', 'username')
        .sort({ createdAt: -1 })
        .limit(limit);

      return activities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  }

  /**
   * Get activities by user
   */
  static async getActivitiesByUser(userId, limit = 50) {
    try {
      const activities = await Activity.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);

      return activities;
    } catch (error) {
      console.error('Error fetching user activities:', error);
      throw error;
    }
  }
}

module.exports = ActivityService;
