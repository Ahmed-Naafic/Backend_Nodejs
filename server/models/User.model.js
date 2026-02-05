/**
 * User Model - MongoDB Schema
 * Represents system users (admins, officers, viewers)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [100, 'Username cannot exceed 100 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'OFFICER', 'VIEWER'],
    default: 'OFFICER'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'DISABLED'],
    default: 'ACTIVE'
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[+]?[0-9]{8,15}$/, 'Invalid phone number format']
  },
  profilePicturePath: {
    type: String,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes
// userSchema.index({ username: 1 });
// userSchema.index({ roleId: 1 });
// userSchema.index({ status: 1 });
// userSchema.index({ deletedAt: 1 });
// userSchema.index({ phoneNumber: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to exclude password from JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Virtual for soft delete check
userSchema.virtual('isDeleted').get(function() {
  return this.deletedAt !== null;
});

const User = mongoose.model('User', userSchema);

module.exports = User;
