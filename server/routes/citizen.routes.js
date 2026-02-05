/**
 * Citizen Routes
 * All citizen management endpoints
 */

const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const CitizenService = require('../services/citizen.service');
const ActivityService = require('../services/activity.service');
const { uploadImage, uploadDocument, getFileUrl } = require('../utils/fileUpload.util');
const multer = require('multer');

// Multer configuration for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadPath = './uploads';
      if (file.fieldname === 'image') {
        uploadPath = './uploads/images';
      } else if (file.fieldname === 'document') {
        uploadPath = './uploads/documents';
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = require('path').extname(file.originalname);
      cb(null, `${req.nationalId || 'file'}_${uniqueSuffix}${ext}`);
    }
  })
});

/**
 * POST /api/citizens
 * Create a new citizen
 */
router.post('/',
  authenticate,
  requirePermission('CREATE_CITIZEN'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]),
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('gender').isIn(['MALE', 'FEMALE']).withMessage('Gender must be MALE or FEMALE'),
    body('dateOfBirth').isISO8601().withMessage('Date of birth must be a valid date'),
    body('placeOfBirth').trim().notEmpty().withMessage('Place of birth is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      // Create citizen
      const citizen = await CitizenService.createCitizen(req.body, req.userId);

      // Handle file uploads
      let imagePath = null;
      let documentPath = null;

      if (req.files?.image) {
        imagePath = req.files.image[0].path;
      }

      if (req.files?.document) {
        documentPath = req.files.document[0].path;
      }

      // Update citizen with file paths
      if (imagePath || documentPath) {
        await CitizenService.updateCitizenFiles(citizen.nationalId, {
          imagePath,
          documentPath
        });
        citizen.imagePath = imagePath;
        citizen.imageUrl = imagePath ? getFileUrl(imagePath) : null;
        citizen.documentPath = documentPath;
        citizen.documentUrl = documentPath ? getFileUrl(documentPath) : null;
      }

      // Log activity
      await ActivityService.logActivity(
        req.userId,
        'CREATE_CITIZEN',
        'citizen',
        citizen.nationalId,
        `Created citizen: ${citizen.firstName} ${citizen.lastName} (ID: ${citizen.nationalId})`,
        req.ip,
        req.get('user-agent')
      );

      res.status(201).json({
        success: true,
        message: 'Citizen registered successfully',
        data: citizen
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/citizens/search?query=...
 * Search citizens
 */
router.get('/search',
  authenticate,
  requirePermission('VIEW_CITIZEN'),
  [
    query('query').notEmpty().withMessage('Search query is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const limit = parseInt(req.query.limit) || 50;
      const citizens = await CitizenService.searchCitizens(req.query.query, limit);

      res.json({
        success: true,
        data: citizens
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/citizens/trash
 * List deleted citizens
 */
router.get('/trash',
  authenticate,
  requirePermission('VIEW_CITIZEN'),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      const result = await CitizenService.listTrash(page, limit);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/citizens/:nationalId
 * Get citizen by National ID
 */
router.get('/:nationalId',
  authenticate,
  requirePermission('VIEW_CITIZEN'),
  async (req, res) => {
    try {
      const citizen = await CitizenService.getCitizenByNationalId(req.params.nationalId);

      if (!citizen) {
        return res.status(404).json({
          success: false,
          message: 'Citizen not found'
        });
      }

      res.json({
        success: true,
        data: citizen
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/citizens
 * List all citizens with pagination
 */
router.get('/',
  authenticate,
  requirePermission('VIEW_CITIZEN'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      const result = await CitizenService.listCitizens(page, limit);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);



/**
 * PUT /api/citizens/:nationalId
 * Update citizen
 */
router.put('/:nationalId',
  authenticate,
  requirePermission('UPDATE_CITIZEN'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // Update citizen data
      const citizen = await CitizenService.updateCitizen(
        req.params.nationalId,
        req.body,
        req.userId
      );

      // Handle file uploads
      if (req.files?.image || req.files?.document) {
        const fileData = {};

        if (req.files?.image) {
          // Delete old image if exists
          if (citizen.imagePath) {
            const fs = require('fs');
            if (fs.existsSync(citizen.imagePath)) {
              fs.unlinkSync(citizen.imagePath);
            }
          }
          fileData.imagePath = req.files.image[0].path;
        }

        if (req.files?.document) {
          // Delete old document if exists
          if (citizen.documentPath) {
            const fs = require('fs');
            if (fs.existsSync(citizen.documentPath)) {
              fs.unlinkSync(citizen.documentPath);
            }
          }
          fileData.documentPath = req.files.document[0].path;
        }

        await CitizenService.updateCitizenFiles(req.params.nationalId, fileData);
      }

      // Get updated citizen
      const updatedCitizen = await CitizenService.getCitizenByNationalId(req.params.nationalId);

      // Log activity
      await ActivityService.logActivity(
        req.userId,
        'UPDATE_CITIZEN',
        'citizen',
        req.params.nationalId,
        `Updated citizen: ${updatedCitizen.firstName} ${updatedCitizen.lastName}`,
        req.ip,
        req.get('user-agent')
      );

      res.json({
        success: true,
        message: 'Citizen updated successfully',
        data: updatedCitizen
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/citizens/:nationalId
 * Soft delete citizen
 */
router.delete('/:nationalId',
  authenticate,
  requirePermission('DELETE_CITIZEN'),
  async (req, res) => {
    try {
      await CitizenService.deleteCitizen(req.params.nationalId, req.userId);

      // Log activity
      await ActivityService.logActivity(
        req.userId,
        'DELETE_CITIZEN',
        'citizen',
        req.params.nationalId,
        `Deleted citizen: ${req.params.nationalId}`,
        req.ip,
        req.get('user-agent')
      );

      res.json({
        success: true,
        message: 'Citizen deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/citizens/:nationalId/status
 * Update citizen status (ADMIN only)
 */
router.post('/:nationalId/status',
  authenticate,
  requirePermission('UPDATE_CITIZEN'),
  [
    body('status').isIn(['ACTIVE', 'DECEASED']).withMessage('Status must be ACTIVE or DECEASED')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const citizen = await CitizenService.updateCitizen(
        req.params.nationalId,
        { status: req.body.status },
        req.userId
      );

      // Log activity
      await ActivityService.logActivity(
        req.userId,
        'UPDATE_CITIZEN_STATUS',
        'citizen',
        req.params.nationalId,
        `Updated citizen status to ${req.body.status}`,
        req.ip,
        req.get('user-agent')
      );

      res.json({
        success: true,
        message: 'Citizen status updated successfully',
        data: citizen
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);



/**
 * POST /api/citizens/trash/:nationalId/restore
 * Restore citizen from trash
 */
router.post('/trash/:nationalId/restore',
  authenticate,
  requirePermission('DELETE_CITIZEN'),
  async (req, res) => {
    try {
      const citizen = await CitizenService.restoreCitizen(req.params.nationalId);

      res.json({
        success: true,
        message: 'Citizen restored successfully',
        data: citizen
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/citizens/trash/:nationalId
 * Permanently delete citizen
 */
router.delete('/trash/:nationalId',
  authenticate,
  requirePermission('DELETE_CITIZEN'),
  async (req, res) => {
    try {
      await CitizenService.deleteCitizenPermanent(req.params.nationalId);

      res.json({
        success: true,
        message: 'Citizen permanently deleted'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;
