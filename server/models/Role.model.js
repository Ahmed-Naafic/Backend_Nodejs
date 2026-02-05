/**
 * Role Model - MongoDB Schema
 * Represents user roles (Admin, Officer, Viewer)
 */

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    enum: ['ADMIN', 'OFFICER', 'VIEWER'],
    uppercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [255, 'Description cannot exceed 255 characters']
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }]
}, {
  timestamps: true,
  collection: 'roles'
});

// Indexes
// roleSchema.index({ name: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
