require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const notificationRoutes = require('./routes/notificationRoutes');
const app = express();
const chatbotRoutes = require('./routes/chatbotRoutes'); 

// ============ CORS Configuration ============
const allowedOrigins = [
  'https://food-recipe-frontend-rust.vercel.app',
  'http://localhost:4200',
  'http://localhost:5000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Content-Length'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours cache for preflight
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// ============ Middleware ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============ Cloudinary Test Endpoint ============
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if credentials exist
if (process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET) {
  
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  console.log('✅ Cloudinary configured');
} else {
  console.warn('⚠️ Cloudinary credentials not found. Image uploads will fail.');
}

// Test Cloudinary connection
app.get('/api/cloudinary/test', async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    res.json({
      success: true,
      message: 'Cloudinary connected',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      status: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cloudinary connection failed',
      error: error.message,
      config: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
        apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
        apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
      }
    });
  }
});

// ============ Routes ============
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/recipes", require("./routes/recipeRoutes"));
app.use('/api/notifications', notificationRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/profile', require('./routes/profileRoutes'));

// ============ Health Check Endpoint ============
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cloudinary: {
      configured: !!(process.env.CLOUDINARY_CLOUD_NAME && 
                    process.env.CLOUDINARY_API_KEY && 
                    process.env.CLOUDINARY_API_SECRET),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 
        `${process.env.CLOUDINARY_CLOUD_NAME.substring(0, 3)}...` : 'Not set'
    },
    cors: {
      allowedOrigins: allowedOrigins
    }
  });
});

// ============ Test Upload Endpoint (for debugging) ============
const { recipeUpload } = require('./middleware/cloudinaryUpload');
app.post('/api/upload-test', recipeUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false,
      message: 'No file uploaded' 
    });
  }
  
  res.json({
    success: true,
    message: 'File uploaded successfully',
    file: {
      url: req.file.path,
      public_id: req.file.filename,
      format: req.file.format,
      bytes: req.file.size,
      created_at: req.file.created_at,
      width: req.file.width,
      height: req.file.height
    }
  });
});

// ============ MongoDB Connection ============
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

console.log('🔗 Connecting to MongoDB...');
console.log('   URI:', MONGODB_URI ? `${MONGODB_URI.substring(0, 50)}...` : 'Not set');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log("✅ MongoDB Connected Successfully");
  console.log("   Database:", mongoose.connection.name);
})
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err.message);
  console.error("   Full error:", err);
  process.exit(1);
});

// MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// ============ Error Handling Middleware ============
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  console.error('Error Stack:', err.stack);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      message: 'CORS Error: Origin not allowed',
      origin: req.headers.origin,
      allowedOrigins: allowedOrigins
    });
  }
  
  res.status(500).json({ 
    message: "Internal Server Error", 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    code: 'SERVER_ERROR'
  });
});

// ============ 404 Handler ============
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ============ Server Start ============
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`☁️ Cloudinary test: http://${HOST}:${PORT}/api/cloudinary/test`);
  console.log(`📤 Upload test: POST http://${HOST}:${PORT}/api/upload-test`);
  console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
  
  // Log environment info
  console.log(`\n⚙️  Environment Configuration:`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT: ${PORT}`);
  console.log(`   CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set'}`);
  console.log(`   BASE_URL: ${process.env.BASE_URL || 'Not set'}`);
  console.log(`   CLIENT_URL: ${process.env.CLIENT_URL || 'Not set'}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set'}`);
});