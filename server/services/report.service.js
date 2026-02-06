/**
 * Report Service
 * Provides reporting functionality
 */

const Citizen = require('../models/Citizen.model');
const User = require('../models/User.model');
const Activity = require('../models/Activity.model');

class ReportService {
  /**
   * Get citizen registration report
   */
  static async getCitizenReport(startDate, endDate) {
    const query = { deletedAt: null };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const citizens = await Citizen.find(query).sort({ createdAt: -1 });

    return {
      total: citizens.length,
      byGender: {
        MALE: citizens.filter(c => c.gender === 'MALE').length,
        FEMALE: citizens.filter(c => c.gender === 'FEMALE').length
      },
      byStatus: {
        ACTIVE: citizens.filter(c => c.status === 'ACTIVE').length,
        DECEASED: citizens.filter(c => c.status === 'DECEASED').length
      },
      data: citizens
    };
  }

  /**
   * Get registration statistics
   */
  static async getRegistrationStats(startDate, endDate) {
    const query = { deletedAt: null };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const registrations = await Citizen.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return registrations;
  }

  /**
   * Get user activity report
   */
  static async getUserActivityReport() {
    const activities = await Activity.aggregate([
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $sort: { count: -1 } }
    ]);

    return activities;
  }

  /**
   * Get summary report (Enhanced for Charts)
   */
  static async getSummaryReport() {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const [
      totalCitizens,
      totalUsers,
      totalActivities,
      genderStats,
      statusStats,
      dailyStats
    ] = await Promise.all([
      Citizen.countDocuments({ deletedAt: null }),
      User.countDocuments({ deletedAt: null }),
      Activity.countDocuments(),
      // Gender distribution
      Citizen.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$gender', count: { $sum: 1 } } }
      ]),
      // Status distribution
      Citizen.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Daily registration for last 7 days
      Citizen.aggregate([
        {
          $match: {
            deletedAt: null,
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Format distributions
    const genderDistribution = {};
    genderStats.forEach(stat => {
      if (stat._id) genderDistribution[stat._id] = stat.count;
    });

    const statusDistribution = {};
    statusStats.forEach(stat => {
      if (stat._id) statusDistribution[stat._id] = stat.count;
    });

    // Fill in last 7 days with zeros if no data
    const dailyRegistrations = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const existing = dailyStats.find(s => s._id === dateStr);
      dailyRegistrations.push({
        _id: dateStr,
        count: existing ? existing.count : 0
      });
    }

    return {
      totalCitizens,
      totalUsers,
      totalActivities,
      genderDistribution,
      statusDistribution,
      dailyRegistrations
    };
  }
}

module.exports = ReportService;
