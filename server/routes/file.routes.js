/**
 * File Routes
 * File serving endpoints
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * GET /api/files/get
 * Serve uploaded files securely
 */
router.get('/get',
  authenticate,
  async (req, res) => {
    try {
      const filePath = req.query.path;
      
      if (!filePath) {
        return res.status(400).json({
          success: false,
          message: 'File path is required'
        });
      }

      // Prevent directory traversal
      const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.join(__dirname, '..', 'uploads', normalizedPath);

      // Ensure file is within uploads directory
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fullPath.startsWith(uploadsDir)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Determine MIME type
      const ext = path.extname(fullPath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };

      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
      
      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error serving file'
      });
    }
  }
);

module.exports = router;
