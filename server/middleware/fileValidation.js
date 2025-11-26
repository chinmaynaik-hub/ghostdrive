/**
 * File Validation Middleware
 * 
 * Provides security enhancements for file uploads:
 * - File size limits (100MB max)
 * - Filename sanitization to prevent path traversal attacks
 * - File type validation (optional)
 * 
 * Requirements: Multiple security considerations
 */

const path = require('path');

// Configuration constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
const MAX_FILENAME_LENGTH = 255;

// Characters that are not allowed in filenames (security risk)
const DANGEROUS_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

// Path traversal patterns to detect
const PATH_TRAVERSAL_PATTERNS = [
  /\.\./,           // Parent directory reference
  /^\.+$/,          // Only dots
  /^\/|^\\/,        // Absolute path
  /~\//,            // Home directory reference
  /%2e%2e/i,        // URL encoded ..
  /%252e%252e/i,    // Double URL encoded ..
  /%c0%ae/i,        // Overlong UTF-8 encoding of .
  /%c1%9c/i,        // Overlong UTF-8 encoding of /
];

/**
 * Sanitizes a filename to prevent path traversal and other security issues
 * @param {string} filename - The original filename
 * @returns {string} - The sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  // Decode any URL encoding first
  let sanitized = filename;
  try {
    sanitized = decodeURIComponent(filename);
  } catch (e) {
    // If decoding fails, use original
    sanitized = filename;
  }

  // Extract just the filename (remove any path components)
  sanitized = path.basename(sanitized);

  // Remove dangerous characters
  sanitized = sanitized.replace(DANGEROUS_CHARS, '_');

  // Replace multiple consecutive dots with single underscore (except for extension)
  sanitized = sanitized.replace(/\.{2,}/g, '_');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Replace multiple consecutive underscores/spaces with single underscore
  sanitized = sanitized.replace(/[_\s]+/g, '_');

  // Remove trailing underscore before extension
  sanitized = sanitized.replace(/_+\./g, '.');

  // Truncate if too long (preserve extension)
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = path.basename(sanitized, ext);
    const maxNameLength = MAX_FILENAME_LENGTH - ext.length;
    sanitized = nameWithoutExt.substring(0, maxNameLength) + ext;
  }

  // If filename is empty after sanitization, use default
  if (!sanitized || sanitized === '') {
    return 'unnamed_file';
  }

  return sanitized;
}

/**
 * Checks if a filename contains path traversal attempts
 * @param {string} filename - The filename to check
 * @returns {boolean} - True if path traversal detected
 */
function hasPathTraversal(filename) {
  if (!filename) return false;
  
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Validates file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size (default: 100MB)
 * @returns {object} - { valid: boolean, message: string }
 */
function validateFileSize(size, maxSize = MAX_FILE_SIZE) {
  if (typeof size !== 'number' || size < 0) {
    return {
      valid: false,
      message: 'Invalid file size'
    };
  }

  if (size === 0) {
    return {
      valid: false,
      message: 'File is empty'
    };
  }

  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const fileSizeMB = (size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      message: `File size (${fileSizeMB}MB) exceeds maximum limit of ${maxSizeMB}MB`
    };
  }

  return {
    valid: true,
    message: 'File size is valid'
  };
}

/**
 * Validates the complete file object
 * @param {object} file - The multer file object
 * @returns {object} - { valid: boolean, message: string, sanitizedFilename: string }
 */
function validateFile(file) {
  if (!file) {
    return {
      valid: false,
      message: 'No file provided',
      sanitizedFilename: null
    };
  }

  // Check for path traversal in original filename
  if (hasPathTraversal(file.originalname)) {
    return {
      valid: false,
      message: 'Invalid filename: path traversal detected',
      sanitizedFilename: null
    };
  }

  // Validate file size
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.valid) {
    return {
      valid: false,
      message: sizeValidation.message,
      sanitizedFilename: null
    };
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.originalname);

  return {
    valid: true,
    message: 'File validation passed',
    sanitizedFilename
  };
}

/**
 * Express middleware for file validation
 * Should be used after multer middleware
 */
function fileValidationMiddleware(req, res, next) {
  // Skip if no file uploaded
  if (!req.file) {
    return next();
  }

  const validation = validateFile(req.file);

  if (!validation.valid) {
    // Clean up the uploaded file if validation fails
    const fs = require('fs');
    if (req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error cleaning up invalid file:', err);
      }
    }

    return res.status(400).json({
      success: false,
      message: validation.message,
      code: 'FILE_VALIDATION_FAILED'
    });
  }

  // Attach sanitized filename to request for use in route handlers
  req.sanitizedFilename = validation.sanitizedFilename;

  next();
}

/**
 * Multer file filter function for additional validation during upload
 * @param {object} req - Express request object
 * @param {object} file - Multer file object
 * @param {function} cb - Callback function
 */
function multerFileFilter(req, file, cb) {
  // Check for path traversal in filename
  if (hasPathTraversal(file.originalname)) {
    return cb(new Error('Invalid filename: path traversal detected'), false);
  }

  // Accept the file
  cb(null, true);
}

/**
 * Creates multer configuration with security settings
 * @param {object} options - Configuration options
 * @returns {object} - Multer configuration object
 */
function createSecureMulterConfig(options = {}) {
  const multer = require('multer');
  
  const maxSize = options.maxSize || MAX_FILE_SIZE;
  const destination = options.destination || 'uploads/';

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      // Generate secure unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });

  return {
    storage,
    limits: {
      fileSize: maxSize,
      files: 1 // Only allow single file upload
    },
    fileFilter: multerFileFilter
  };
}

module.exports = {
  // Constants
  MAX_FILE_SIZE,
  MAX_FILENAME_LENGTH,
  
  // Functions
  sanitizeFilename,
  hasPathTraversal,
  validateFileSize,
  validateFile,
  
  // Middleware
  fileValidationMiddleware,
  multerFileFilter,
  createSecureMulterConfig
};
