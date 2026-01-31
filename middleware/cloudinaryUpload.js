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
const profileMulter = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const coverMulter = multer({
  storage: coverStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const recipeMulter = multer({
  storage: recipeStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware function to handle profile uploads - FIXED VERSION
const profileUploadMiddleware = (req, res, next) => {
  profileMulter.single('profilePicture')(req, res, (err) => {
    if (err) {
      console.error('❌ Profile upload error:', err.message);
      
      // Create error object to pass to next()
      const error = new Error(err.message);
      error.code = err.code;
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        error.status = 400;
        error.message = 'File too large. Maximum size is 5MB';
        error.code = 'FILE_TOO_LARGE';
      } else if (err.message.includes('Invalid file type')) {
        error.status = 400;
        error.message = err.message;
        error.code = 'INVALID_FILE_TYPE';
      } else {
        error.status = 500;
        error.message = `Upload failed: ${err.message}`;
        error.code = 'UPLOAD_ERROR';
      }
      
      return next(error);
    }
    
    if (!req.file) {
      const error = new Error('No file uploaded');
      error.status = 400;
      error.code = 'NO_FILE';
      return next(error);
    }
    
    console.log(`✅ Profile picture uploaded successfully:`, {
      path: req.file.path,
      secure_url: req.file.secure_url,
      filename: req.file.originalname
    });
    
    // Ensure consistent URL
    if (req.file.secure_url) {
      req.file.url = req.file.secure_url;
    }
    
    next();
  });
};

// Middleware function to handle cover uploads - FIXED VERSION
const coverUploadMiddleware = (req, res, next) => {
  coverMulter.single('coverPicture')(req, res, (err) => {
    if (err) {
      console.error('❌ Cover upload error:', err.message);
      
      // Create error object to pass to next()
      const error = new Error(err.message);
      error.code = err.code;
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        error.status = 400;
        error.message = 'File too large. Maximum size is 10MB';
        error.code = 'FILE_TOO_LARGE';
      } else {
        error.status = 500;
        error.message = `Upload failed: ${err.message}`;
        error.code = 'UPLOAD_ERROR';
      }
      
      return next(error);
    }
    
    if (!req.file) {
      const error = new Error('No file uploaded');
      error.status = 400;
      error.code = 'NO_FILE';
      return next(error);
    }
    
    console.log(`✅ Cover picture uploaded successfully:`, {
      path: req.file.path,
      secure_url: req.file.secure_url,
      filename: req.file.originalname
    });
    
    // Ensure consistent URL
    if (req.file.secure_url) {
      req.file.url = req.file.secure_url;
    }
    
    next();
  });
};

// Export upload handlers
module.exports = {
  profileUpload: profileUploadMiddleware,
  coverUpload: coverUploadMiddleware,
  
  // Recipe uploads - FIXED VERSION
  recipeUpload: (req, res, next) => {
    recipeMulter.single('image')(req, res, (err) => {
      if (err) {
        console.error('❌ Recipe upload error:', err.message);
        
        // Create error object to pass to next()
        const error = new Error(err.message);
        error.code = err.code;
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          error.status = 400;
          error.message = 'File too large. Maximum size is 10MB';
          error.code = 'FILE_TOO_LARGE';
        } else {
          error.status = 500;
          error.message = `Upload failed: ${err.message}`;
          error.code = 'UPLOAD_ERROR';
        }
        
        return next(error);
      }
      
      if (!req.file) {
        const error = new Error('No file uploaded');
        error.status = 400;
        error.code = 'NO_FILE';
        return next(error);
      }
      
      next();
    });
  },
  
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