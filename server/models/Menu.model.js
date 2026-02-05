/**
 * Menu Model - MongoDB Schema
 * Represents navigation menu items
 */

const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Menu name is required'],
    trim: true
  },
  route: {
    type: String,
    default: null,
    trim: true
  },
  icon: {
    type: String,
    default: null,
    trim: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    default: null
  },
  orderIndex: {
    type: Number,
    default: 0
  },
  permissionCode: {
    type: String,
    default: null,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'menus'
});

// Indexes
// menuSchema.index({ parentId: 1 });
// menuSchema.index({ permissionCode: 1 });
// menuSchema.index({ orderIndex: 1 });

const Menu = mongoose.model('Menu', menuSchema);

module.exports = Menu;
