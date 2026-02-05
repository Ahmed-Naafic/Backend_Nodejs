/**
 * Notice Model - MongoDB Schema
 * Represents system notices/announcements
 */

const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notice title is required'],
    trim: true,
    maxlength: [255, 'Title cannot exceed 255 characters']
  },
  message: {
    type: String,
    required: [true, 'Notice message is required']
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'notices'
});

// Indexes
// noticeSchema.index({ priority: 1 });
// noticeSchema.index({ expiresAt: 1 });
// noticeSchema.index({ createdAt: -1 });

const Notice = mongoose.model('Notice', noticeSchema);

module.exports = Notice;
