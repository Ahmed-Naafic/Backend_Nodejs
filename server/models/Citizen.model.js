/**
 * Citizen Model - MongoDB Schema
 * Represents citizen registration records
 */

const mongoose = require('mongoose');

const citizenSchema = new mongoose.Schema({
  nationalId: {
    type: String,
    required: [true, 'National ID is required'],
    unique: true,
    trim: true,
    length: [10, 'National ID must be exactly 10 digits'],
    match: [/^\d{10}$/, 'National ID must be 10 digits']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [100, 'First name cannot exceed 100 characters']
  },
  middleName: {
    type: String,
    trim: true,
    maxlength: [100, 'Middle name cannot exceed 100 characters'],
    default: null
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [100, 'Last name cannot exceed 100 characters']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['MALE', 'FEMALE']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(value) {
        const today = new Date();
        const hundredYearsAgo = new Date();
        hundredYearsAgo.setFullYear(today.getFullYear() - 100);
        
        return value <= today && value >= hundredYearsAgo;
      },
      message: 'Date of birth must be between 100 years ago and today'
    }
  },
  placeOfBirth: {
    type: String,
    required: [true, 'Place of birth is required'],
    trim: true,
    maxlength: [200, 'Place of birth cannot exceed 200 characters']
  },
  nationality: {
    type: String,
    default: 'Somali',
    trim: true,
    maxlength: [100, 'Nationality cannot exceed 100 characters']
  },
  imagePath: {
    type: String,
    default: null
  },
  documentPath: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'DECEASED'],
    default: 'ACTIVE'
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'citizens'
});

// Indexes
// citizenSchema.index({ nationalId: 1 }, { unique: true });
// citizenSchema.index({ status: 1 });
// citizenSchema.index({ deletedAt: 1 });
// citizenSchema.index({ firstName: 1, middleName: 1, lastName: 1 });
// citizenSchema.index({ createdAt: -1 });

// Virtual for full name
citizenSchema.virtual('fullName').get(function() {
  if (this.middleName) {
    return `${this.firstName} ${this.middleName} ${this.lastName}`;
  }
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for soft delete check
citizenSchema.virtual('isDeleted').get(function() {
  return this.deletedAt !== null;
});

// Method to exclude deleted citizens
citizenSchema.statics.findActive = function() {
  return this.find({ deletedAt: null });
};

const Citizen = mongoose.model('Citizen', citizenSchema);

module.exports = Citizen;
