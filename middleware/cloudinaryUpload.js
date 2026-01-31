const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Log Cloudinary configuration status
console.log('🔧 Cloudinary Configuration Check:');
console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Not Set');
console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Not Set');
console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Not Set');

// Configure Cloudinary with error handling
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured successfully');
} catch (error) {
  console.error('❌ Cloudinary configuration failed:', error.message);
}

// File filter with better error messages
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
  }
  
  // You can also add size check here if needed
  cb(null, true);
};

// Cloudinary storage configurations
const recipeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'food-recipes/recipes',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit' }],
    resource_type: 'image',
    public_id: (req, file) => {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.[^/.]+$/, ""); // Remove extension
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      return `recipe-${sanitizedName}-${timestamp}`;
    }
  }
});

const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'food-recipes/profile',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'thumb', gravity: 'face' }],
    resource_type: 'image',
    public_id: (req, file) => {
      const timestamp = Date.now();
      const userId = req.user ? req.user.id : 'anonymous';
      return `profile-${userId}-${timestamp}`;
    }
  }
});

const coverStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'food-recipes/cover',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1500, height: 500, crop: 'limit' }],
    resource_type: 'image',
    public_id: (req, file) => {
      const timestamp = Date.now();
      const userId = req.user ? req.user.id : 'anonymous';
      return `cover-${userId}-${timestamp}`;
    }
  }
});

// Create multer instances with error handling
const createUploader = (storage, fileSize) => {
  return multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: { fileSize: fileSize },
    onError: (err, next) => {
      console.error('❌ Multer error:', err);
      next(err);
    }
  });
};

const recipeUpload = createUploader(recipeStorage, 10 * 1024 * 1024); // 10MB
const profileUpload = createUploader(profileStorage, 5 * 1024 * 1024); // 5MB
const coverUpload = createUploader(coverStorage, 10 * 1024 * 1024); // 10MB

// Upload handlers with better error handling
const createUploadHandler = (uploadMethod, type) => {
  return (req, res, next) => {
    uploadMethod(req, res, (err) => {
      if (err) {
        console.error(`❌ ${type} upload error:`, err.message);
        
        // Handle specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: `File too large. Maximum size is ${type === 'profile' ? '5MB' : '10MB'}`,
            code: 'FILE_TOO_LARGE'
          });
        }
        
        if (err.message.includes('Invalid file type')) {
          return res.status(400).json({
            message: err.message,
            code: 'INVALID_FILE_TYPE'
          });
        }
        
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
          return res.status(500).json({
            message: 'Cloudinary is not configured. Please check server settings.',
            code: 'CLOUDINARY_NOT_CONFIGURED'
          });
        }
        
        return res.status(400).json({
          message: `Upload failed: ${err.message}`,
          code: 'UPLOAD_ERROR'
        });
      }
      
      // Log successful upload
      if (req.file) {
        console.log(`✅ ${type} uploaded to Cloudinary:`, {
          url: req.file.path,
          size: req.file.size,
          format: req.file.format,
          folder: req.file.folder
        });
      } else {
        console.log(`⚠️ No file uploaded for ${type}`);
      }
      
      next();
    });
  };
};

// Export upload handlers with error handling
module.exports = {
  // Recipe image upload with error handling
  recipeUpload: createUploadHandler(recipeUpload.single('image'), 'recipe'),
  
  // Profile picture upload with error handling
  profileUpload: createUploadHandler(profileUpload.single('profilePicture'), 'profile'),
  
  // Cover picture upload with error handling  
  coverUpload: createUploadHandler(coverUpload.single('coverPicture'), 'cover'),
  
  // Multiple images for recipes (optional)
  recipeMultipleUpload: createUploadHandler(recipeUpload.array('images', 5), 'recipe-multiple'),
  
  // Direct access to multer instances (for advanced usage)
  multerInstances: {
    recipe: recipeUpload,
    profile: profileUpload,
    cover: coverUpload
  },
  
  // Utility function to test Cloudinary connection
  testConnection: async () => {
    try {
      const result = await cloudinary.api.ping();
      console.log('✅ Cloudinary connection test:', result);
      return { success: true, message: 'Cloudinary connected' };
    } catch (error) {
      console.error('❌ Cloudinary connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
};