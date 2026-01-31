const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured for cloud:', process.env.CLOUDINARY_CLOUD_NAME);
} else {
  console.warn('⚠️ Cloudinary environment variables missing!');
}

// File filter
const imageFilter = (req, file, cb) => {
  console.log('🔍 File filter check:', {
    mimetype: file.mimetype,
    originalname: file.originalname
  });
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.mimetype)) {
    console.error('❌ Invalid file type:', file.mimetype);
    return cb(new Error(`Invalid file type. Allowed: JPEG, JPG, PNG, GIF, WEBP`), false);
  }
  
  cb(null, true);
};

// Helper to generate unique filename
const generatePublicId = (req, file, folderName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const userId = req.user ? req.user.id : 'guest';
  const originalName = path.parse(file.originalname).name;
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  
  return `${folderName}-${userId}-${sanitizedName}-${timestamp}-${randomString}`;
};

// Create Cloudinary storage configurations
const createCloudinaryStorage = (folderName, transformation = []) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `food-recipes/${folderName}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: transformation,
      resource_type: 'image',
      public_id: (req, file) => {
        return generatePublicId(req, file, folderName);
      }
    }
  });
};

// Create storages
const profileStorage = createCloudinaryStorage('profile', [
  { width: 400, height: 400, crop: 'fill', gravity: 'face' }
]);

const coverStorage = createCloudinaryStorage('cover', [
  { width: 1500, height: 500, crop: 'fill' }
]);

const recipeStorage = createCloudinaryStorage('recipes', [
  { width: 1200, height: 800, crop: 'limit' }
]);

// Create multer uploaders
const profileUpload = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const coverUpload = multer({
  storage: coverStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const recipeUpload = multer({
  storage: recipeStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware functions
exports.uploadProfilePicture = (req, res, next) => {
  profileUpload.single('profilePicture')(req, res, (err) => {
    handleUploadError(err, req, res, next, 'profile');
  });
};

exports.uploadCoverPicture = (req, res, next) => {
  coverUpload.single('coverPicture')(req, res, (err) => {
    handleUploadError(err, req, res, next, 'cover');
  });
};

exports.uploadRecipeImage = (req, res, next) => {
  recipeUpload.single('image')(req, res, (err) => {
    handleUploadError(err, req, res, next, 'recipe');
  });
};

exports.uploadRecipeImages = (req, res, next) => {
  recipeUpload.array('images', 10)(req, res, (err) => {
    handleUploadError(err, req, res, next, 'recipe-multiple');
  });
};

// Error handler
function handleUploadError(err, req, res, next, type) {
  if (err) {
    console.error(`❌ ${type} upload error:`, err.message);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${err.limit / (1024*1024)}MB`,
        code: 'FILE_TOO_LARGE'
      });
    }
    
    if (err.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: err.message,
        code: 'INVALID_FILE_TYPE'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: `Upload failed: ${err.message}`,
      code: 'UPLOAD_ERROR'
    });
  }
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
      code: 'NO_FILE'
    });
  }
  
  console.log(`✅ ${type} uploaded successfully:`, {
    path: req.file.path,
    secure_url: req.file.secure_url,
    filename: req.file.originalname
  });
  
  // Ensure consistent URL
  if (req.file.secure_url) {
    req.file.url = req.file.secure_url;
  }
  
  next();
}

// Test function
exports.testCloudinary = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection test successful');
    return { connected: true, ...result };
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    return { connected: false, error: error.message };
  }
};