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
const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('profilePicture');

const uploadCover = multer({
  storage: coverStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('coverPicture');

const uploadRecipe = multer({
  storage: recipeStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('image');

// Middleware wrapper functions
const uploadProfileMiddleware = (req, res, next) => {
  uploadProfile(req, res, (err) => {
    if (err) {
      console.error('❌ Profile upload error:', err.message);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false,
          message: 'File too large. Maximum size is 5MB',
          code: 'FILE_TOO_LARGE'
        });
      } else if (err.message.includes('Invalid file type')) {
        return res.status(400).json({ 
          success: false,
          message: err.message,
          code: 'INVALID_FILE_TYPE'
        });
      } else {
        return res.status(500).json({ 
          success: false,
          message: `Upload failed: ${err.message}`,
          code: 'UPLOAD_ERROR'
        });
      }
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }
    
    console.log(`✅ Profile picture uploaded successfully:`, {
      path: req.file.path,
      secure_url: req.file.secure_url,
      filename: req.file.originalname
    });
    
    next();
  });
};

const uploadCoverMiddleware = (req, res, next) => {
  uploadCover(req, res, (err) => {
    if (err) {
      console.error('❌ Cover upload error:', err.message);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false,
          message: 'File too large. Maximum size is 10MB',
          code: 'FILE_TOO_LARGE'
        });
      } else {
        return res.status(500).json({ 
          success: false,
          message: `Upload failed: ${err.message}`,
          code: 'UPLOAD_ERROR'
        });
      }
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }
    
    console.log(`✅ Cover picture uploaded successfully:`, {
      path: req.file.path,
      secure_url: req.file.secure_url,
      filename: req.file.originalname
    });
    
    next();
  });
};

const uploadRecipeMiddleware = (req, res, next) => {
  uploadRecipe(req, res, (err) => {
    if (err) {
      console.error('❌ Recipe upload error:', err.message);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false,
          message: 'File too large. Maximum size is 10MB',
          code: 'FILE_TOO_LARGE'
        });
      } else {
        return res.status(500).json({ 
          success: false,
          message: `Upload failed: ${err.message}`,
          code: 'UPLOAD_ERROR'
        });
      }
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }
    
    next();
  });
};

// Export upload handlers
module.exports = {
  uploadProfile: uploadProfileMiddleware,
  uploadCover: uploadCoverMiddleware,
  uploadRecipe: uploadRecipeMiddleware,
  
  // Test function
  testCloudinary: async () => {
    try {
      const result = await cloudinary.api.ping();
      console.log('✅ Cloudinary connection test successful');
      return { connected: true, ...result };
    } catch (error) {
      console.error('❌ Cloudinary connection test failed:', error.message);
      return { connected: false, error: error.message };
    }
  }
};