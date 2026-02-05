/**
 * File Upload Utility
 * Handles secure file uploads using Multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

// Upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directories exist
const ensureDirectories = () => {
  const dirs = [
    path.join(UPLOAD_DIR, 'images'),
  
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectories();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = UPLOAD_DIR;
    
    if (file.fieldname === 'image') {
      uploadPath = path.join(UPLOAD_DIR, 'images');
    } 
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    // Use nationalId or userId from request if available
    const identifier = req.nationalId || req.userId || 'file';
    cb(null, `${identifier}_${uniqueSuffix}${ext}`);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed.'), false);
  }
};



// Multer instances
const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_SIZE }
});




// Delete file utility
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Get file URL
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  
  // If already a full URL, return as is
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // Convert relative path to URL
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/${filePath.replace(/^\.\//, '')}`;
};

module.exports = {
  uploadImage,
  deleteFile,
  getFileUrl,
  MAX_IMAGE_SIZE,
  MAX_DOCUMENT_SIZE
};
