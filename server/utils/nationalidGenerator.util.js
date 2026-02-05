/**
 * National ID Generator Utility
 * Generates unique 10-digit National IDs
 */

const Citizen = require('../models/Citizen.model');

const ID_LENGTH = 10;

/**
 * Generate a unique national ID
 */
const generateNationalId = async () => {
  const maxAttempts = 100;
  let attempt = 0;

  while (attempt < maxAttempts) {
    // Generate random numeric ID
    const nationalId = generateRandomId();

    // Check if ID exists
    const exists = await Citizen.findOne({ nationalId });
    if (!exists) {
      return nationalId;
    }

    attempt++;
  }

  // Fallback to sequential ID
  return await generateSequentialId();
};

/**
 * Generate random numeric ID
 */
const generateRandomId = () => {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
};

/**
 * Generate sequential ID based on database
 */
const generateSequentialId = async () => {
  try {
    // Get the highest numeric ID
    const lastCitizen = await Citizen.findOne(
      { nationalId: { $regex: /^\d+$/ } },
      {},
      { sort: { nationalId: -1 } }
    );

    let nextId = 1;
    if (lastCitizen && lastCitizen.nationalId) {
      nextId = parseInt(lastCitizen.nationalId) + 1;
    }

    // Pad with zeros
    let nationalId = nextId.toString().padStart(ID_LENGTH, '0');

    // Verify uniqueness
    while (await Citizen.findOne({ nationalId })) {
      nextId++;
      nationalId = nextId.toString().padStart(ID_LENGTH, '0');
    }

    return nationalId;
  } catch (error) {
    // Fallback to timestamp-based ID
    const timestamp = Date.now();
    let nationalId = timestamp.toString().slice(-ID_LENGTH).padStart(ID_LENGTH, '0');

    while (await Citizen.findOne({ nationalId })) {
      const newTimestamp = Date.now();
      nationalId = newTimestamp.toString().slice(-ID_LENGTH).padStart(ID_LENGTH, '0');
    }

    return nationalId;
  }
};

module.exports = {
  generateNationalId
};
