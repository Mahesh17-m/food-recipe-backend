const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const getUploadsPath = (subdir = '') => {
  return path.join(__dirname, '../uploads', subdir);
};

const cleanFilename = (filename) => {
  return filename
    .replace(/@/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase();
};

const ensureUploadDirs = () => {
  const directories = ['recipes', 'profile', 'profile/cover'];
  
  directories.forEach(dir => {
    const dirPath = getUploadsPath(dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created upload directory: ${dirPath}`);
    }
  });
};

ensureUploadDirs();

const recipeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getUploadsPath('recipes');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let filename = uuidv4() + ext;
    filename = cleanFilename(filename);
    console.log(`📸 Saving recipe image as: ${filename}`);
    cb(null, filename);
  }
});

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getUploadsPath('profile');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let filename = uuidv4() + ext;
    filename = cleanFilename(filename);
    console.log(`📸 Saving profile image as: ${filename}`);
    cb(null, filename);
  }
});

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getUploadsPath('profile/cover');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let filename = uuidv4() + ext;
    filename = cleanFilename(filename);
    console.log(`📸 Saving cover image as: ${filename}`);
    cb(null, filename);
  }
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};

const recipeUpload = multer({
  storage: recipeStorage,
  fileFilter: imageFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

const profileUpload = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

const coverUpload = multer({
  storage: coverStorage,
  fileFilter: imageFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB (cover images can be larger)
  }
});

const recipeUploadSingle = recipeUpload.single('image');
const recipeUploadWithHandling = (req, res, next) => {
  recipeUploadSingle(req, res, (err) => {
    if (err) {
      console.error('❌ Upload error:', err.message);
      return res.status(400).json({
        message: err.message,
        code: 'UPLOAD_ERROR'
      });
    }
    
    if (req.file) {
      console.log('✅ File uploaded successfully:', {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      });
      if (!fs.existsSync(req.file.path)) {
        console.error('❌ CRITICAL: File was not written to disk!');
        return res.status(500).json({
          message: 'File upload failed - file not saved',
          code: 'FILE_SAVE_ERROR'
        });
      }
    }
    
    next();
  });
};

const profileUploadSingle = profileUpload.single('profilePicture');
const profileUploadWithHandling = (req, res, next) => {
  profileUploadSingle(req, res, (err) => {
    if (err) {
      console.error('❌ Profile upload error:', err.message);
      return res.status(400).json({
        message: err.message,
        code: 'UPLOAD_ERROR'
      });
    }
    
    if (req.file) {
      console.log('✅ Profile file uploaded successfully:', {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      });
    }
    
    next();
  });
};

const coverUploadSingle = coverUpload.single('coverPicture');
const coverUploadWithHandling = (req, res, next) => {
  coverUploadSingle(req, res, (err) => {
    if (err) {
      console.error('❌ Cover upload error:', err.message);
      return res.status(400).json({
        message: err.message,
        code: 'UPLOAD_ERROR'
      });
    }
    
    if (req.file) {
      console.log('✅ Cover file uploaded successfully:', {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      });
    }
    
    next();
  });
};

module.exports = {
  recipeUpload: recipeUploadWithHandling,
  profileUpload: profileUploadWithHandling,
  coverUpload: coverUploadWithHandling
};