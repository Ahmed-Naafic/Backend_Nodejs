/**
 * Citizen Service
 * Business logic for citizen operations
 */

const Citizen = require('../models/Citizen.model');
const { generateNationalId } = require('../utils/nationalIdGenerator.util');
const StatusChangeLog = require('../models/StatusChangeLog.model');

class CitizenService {
  /**
   * Create a new citizen
   */
  static async createCitizen(data, userId) {
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'gender', 'dateOfBirth', 'placeOfBirth'];
    for (const field of requiredFields) {
      if (!data[field] || !data[field].toString().trim()) {
        throw new Error(`Field '${field}' is required`);
      }
    }

    // Validate gender
    const gender = data.gender.toUpperCase();
    if (!['MALE', 'FEMALE'].includes(gender)) {
      throw new Error("Gender must be 'MALE' or 'FEMALE'");
    }

    // Validate date of birth
    const dateOfBirth = new Date(data.dateOfBirth);
    const today = new Date();
    const hundredYearsAgo = new Date();
    hundredYearsAgo.setFullYear(today.getFullYear() - 100);

    if (dateOfBirth > today) {
      throw new Error('Date of birth cannot be in the future');
    }

    if (dateOfBirth < hundredYearsAgo) {
      throw new Error('Date of birth cannot be more than 100 years ago');
    }

    // Generate unique national ID
    const nationalId = await generateNationalId();

    // Check if national ID already exists (shouldn't happen, but safety check)
    const exists = await Citizen.findOne({ nationalId });
    if (exists) {
      throw new Error('National ID collision. Please try again.');
    }

    // Create citizen
    const citizen = new Citizen({
      nationalId,
      firstName: data.firstName.trim(),
      middleName: data.middleName?.trim() || null,
      lastName: data.lastName.trim(),
      gender,
      dateOfBirth,
      placeOfBirth: data.placeOfBirth.trim(),
      nationality: data.nationality?.trim() || 'Somali',
      status: 'ACTIVE'
    });

    await citizen.save();
    return this.normalizeCitizen(citizen);
  }

  /**
   * Get citizen by National ID
   */
  static async getCitizenByNationalId(nationalId) {
    const citizen = await Citizen.findOne({ 
      nationalId,
      deletedAt: null 
    });

    if (!citizen) {
      return null;
    }

    return this.normalizeCitizen(citizen);
  }

  /**
   * Update citizen
   */
  static async updateCitizen(nationalId, data, userId) {
    const citizen = await Citizen.findOne({ 
      nationalId,
      deletedAt: null 
    });

    if (!citizen) {
      throw new Error('Citizen not found');
    }

    // Update allowed fields
    if (data.firstName) citizen.firstName = data.firstName.trim();
    if (data.middleName !== undefined) citizen.middleName = data.middleName?.trim() || null;
    if (data.lastName) citizen.lastName = data.lastName.trim();
    if (data.gender) {
      const gender = data.gender.toUpperCase();
      if (!['MALE', 'FEMALE'].includes(gender)) {
        throw new Error("Gender must be 'MALE' or 'FEMALE'");
      }
      citizen.gender = gender;
    }
    if (data.dateOfBirth) {
      const dateOfBirth = new Date(data.dateOfBirth);
      const today = new Date();
      const hundredYearsAgo = new Date();
      hundredYearsAgo.setFullYear(today.getFullYear() - 100);

      if (dateOfBirth > today) {
        throw new Error('Date of birth cannot be in the future');
      }
      if (dateOfBirth < hundredYearsAgo) {
        throw new Error('Date of birth cannot be more than 100 years ago');
      }
      citizen.dateOfBirth = dateOfBirth;
    }
    if (data.placeOfBirth) citizen.placeOfBirth = data.placeOfBirth.trim();
    if (data.nationality) citizen.nationality = data.nationality.trim();
    if (data.status) {
      const oldStatus = citizen.status;
      citizen.status = data.status.toUpperCase();
      
      // Log status change
      if (oldStatus !== citizen.status) {
        await StatusChangeLog.create({
          nationalId,
          oldStatus,
          newStatus: citizen.status,
          changedBy: userId
        });
      }
    }

    await citizen.save();
    return this.normalizeCitizen(citizen);
  }

  /**
   * Update citizen file paths
   */
  static async updateCitizenFiles(nationalId, fileData) {
    const citizen = await Citizen.findOne({ nationalId, deletedAt: null });
    if (!citizen) {
      throw new Error('Citizen not found');
    }

    if (fileData.imagePath) citizen.imagePath = fileData.imagePath;
    if (fileData.documentPath) citizen.documentPath = fileData.documentPath;

    await citizen.save();
    return this.normalizeCitizen(citizen);
  }

  /**
   * List citizens with pagination
   */
  static async listCitizens(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const [citizens, total] = await Promise.all([
      Citizen.find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Citizen.countDocuments({ deletedAt: null })
    ]);

    return {
      data: citizens.map(c => this.normalizeCitizen(c)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Search citizens
   */
  static async searchCitizens(query, limit = 50) {
    const searchRegex = new RegExp(query, 'i');
    
    const citizens = await Citizen.find({
      deletedAt: null,
      $or: [
        { nationalId: searchRegex },
        { firstName: searchRegex },
        { middleName: searchRegex },
        { lastName: searchRegex }
      ]
    })
    .limit(limit)
    .sort({ createdAt: -1 });

    return citizens.map(c => this.normalizeCitizen(c));
  }

  /**
   * Soft delete citizen
   */
  static async deleteCitizen(nationalId, userId) {
    const citizen = await Citizen.findOne({ nationalId, deletedAt: null });
    if (!citizen) {
      throw new Error('Citizen not found');
    }

    citizen.deletedAt = new Date();
    await citizen.save();

    return true;
  }

  /**
   * Restore citizen from trash
   */
  static async restoreCitizen(nationalId) {
    const citizen = await Citizen.findOne({ nationalId });
    if (!citizen) {
      throw new Error('Citizen not found');
    }

    citizen.deletedAt = null;
    await citizen.save();

    return this.normalizeCitizen(citizen);
  }

  /**
   * Permanently delete citizen
   */
  static async deleteCitizenPermanent(nationalId) {
    const citizen = await Citizen.findOne({ nationalId });
    if (!citizen) {
      throw new Error('Citizen not found');
    }

    await Citizen.deleteOne({ _id: citizen._id });
    return true;
  }

  /**
   * List deleted citizens (trash)
   */
  static async listTrash(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const [citizens, total] = await Promise.all([
      Citizen.find({ deletedAt: { $ne: null } })
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limit),
      Citizen.countDocuments({ deletedAt: { $ne: null } })
    ]);

    return {
      data: citizens.map(c => this.normalizeCitizen(c)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Normalize citizen data for API response
   */
  static normalizeCitizen(citizen) {
    const { getFileUrl } = require('../utils/fileUpload.util');
    
    return {
      id: citizen._id.toString(),
      nationalId: citizen.nationalId,
      firstName: citizen.firstName,
      middleName: citizen.middleName,
      lastName: citizen.lastName,
      fullName: citizen.fullName,
      gender: citizen.gender,
      dateOfBirth: citizen.dateOfBirth.toISOString().split('T')[0],
      placeOfBirth: citizen.placeOfBirth,
      nationality: citizen.nationality,
      status: citizen.status,
      imagePath: citizen.imagePath,
      imageUrl: citizen.imagePath ? getFileUrl(citizen.imagePath) : null,
      documentPath: citizen.documentPath,
      documentUrl: citizen.documentPath ? getFileUrl(citizen.documentPath) : null,
      createdAt: citizen.createdAt,
      updatedAt: citizen.updatedAt
    };
  }
}

module.exports = CitizenService;
