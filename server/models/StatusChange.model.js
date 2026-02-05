/**
 * Status Change Log Model - MongoDB Schema
 * Audit trail for citizen status changes
 */

const mongoose = require('mongoose');

const statusChangeLogSchema = new mongoose.Schema({
  nationalId: {
    type: String,
    required: true,
    ref: 'Citizen',
    index: true
  },
  oldStatus: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'DECEASED']
  },
  newStatus: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'DECEASED']
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: 'changedAt', updatedAt: false },
  collection: 'status_change_logs'
});

// Indexes
// statusChangeLogSchema.index({ nationalId: 1 });
// statusChangeLogSchema.index({ changedAt: -1 });

const StatusChangeLog = mongoose.model('StatusChangeLog', statusChangeLogSchema);

module.exports = StatusChangeLog;
