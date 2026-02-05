/**
 * Notice Service
 * Handles system notices/announcements
 */

const Notice = require('../models/Notice.model');

class NoticeService {
  /**
   * Create a notice
   */
  static async createNotice(data, createdBy) {
    const notice = new Notice({
      title: data.title.trim(),
      message: data.message.trim(),
      priority: data.priority?.toUpperCase() || 'MEDIUM',
      createdBy,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
    });

    await notice.save();
    return notice;
  }

  /**
   * Get all active notices
   */
  static async getActiveNotices() {
    const now = new Date();
    
    const notices = await Notice.find({
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    })
    .populate('createdBy', 'username')
    .sort({ priority: -1, createdAt: -1 });

    return notices;
  }

  /**
   * Delete a notice
   */
  static async deleteNotice(noticeId) {
    const notice = await Notice.findById(noticeId);
    if (!notice) {
      throw new Error('Notice not found');
    }

    await Notice.deleteOne({ _id: noticeId });
    return true;
  }
}

module.exports = NoticeService;
