# 🍳 Food Recipe AI Backend

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Database Models](#database-models)
- [AI Integration](#ai-integration)
- [Running Locally](#running-locally)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [Security](#security)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)


---

## 📖 Overview

A robust backend API for a Food Recipe Website with AI-powered cooking assistant. This service handles user authentication, recipe management, and AI-powered cooking assistance using HuggingFace models.

---

## ✨ Features

### 🔐 Authentication & Authorization
- Google OAuth 2.0 integration
- JWT-based session management
- Role-based access control
- Secure password hashing

### 🍽️ Recipe Management
- CRUD operations for recipes
- Recipe search and filtering
- Category-based organization
- Image upload support
- Favorite recipes tracking

### 🤖 AI Cooking Assistant
- Integration with HuggingFace AI models
- Natural language recipe queries
- Cooking tips and suggestions
- Ingredient substitution recommendations
- Recipe generation from available ingredients

### 📊 Data Management
- MongoDB Atlas for cloud database
- Efficient data modeling
- Data validation and sanitization
- Backup and recovery systems

### ⚡ Performance & Security
- Rate limiting and request throttling
- CORS configuration
- Input validation and sanitization
- SQL injection prevention
- XSS protection

---

## 🛠 Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | 18.x+ |
| **Express.js** | Web Framework | 4.x |
| **MongoDB** | Database | 6.0+ |
| **Mongoose** | ODM for MongoDB | 7.x |
| **JWT** | Authentication | 9.x |
| **Passport.js** | Authentication Middleware | 0.6 |
| **Google OAuth2** | Social Authentication | - |
| **HuggingFace API** | AI Integration | - |
| **bcryptjs** | Password Hashing | 2.4 |
| **cors** | Cross-Origin Resource Sharing | 2.8 |
| **dotenv** | Environment Configuration | 16.0 |
| **express-rate-limit** | Rate Limiting | 6.7 |
| **multer** | File Uploads | 1.4 |
| **supertest** | HTTP Testing | 6.3 |

---

## 📋 Prerequisites

Before you begin, ensure you have installed:

1. **Node.js** (v18 or higher)
   ```bash
   node --version
   ```

2. **npm** (v8 or higher)
   ```bash
   npm --version
   ```

3. **MongoDB** (Local or Atlas account)
   - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Recommended)
   - Local MongoDB installation

4. **Required Accounts:**
   - [Google Cloud Console](https://console.cloud.google.com/)
   - [HuggingFace](https://huggingface.co/)
   - [Cloudinary](https://cloudinary.com/) (for image uploads)

---

## ⚙️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/food-recipe-backend.git
cd food-recipe-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration (see [Environment Variables](#environment-variables)).

### 4. Database Setup
#### Option A: MongoDB Atlas (Recommended)
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user
3. Whitelist your IP address
4. Get your connection string

#### Option B: Local MongoDB
```bash
# Install MongoDB locally
# For macOS:
brew tap mongodb/brew
brew install mongodb-community@6.0

# Start MongoDB service
brew services start mongodb-community@6.0
```

### 5. Run the Application
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start

# Debug mode
npm run debug
```

The server will start at `http://localhost:3000`

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# ====================
# SERVER CONFIGURATION
# ====================
NODE_ENV=development
PORT=3000
SERVER_URL=http://localhost:3000

# ====================
# DATABASE CONFIGURATION
# ====================
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/recipe_db?retryWrites=true&w=majority
DB_NAME=recipe_db
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=30000

# ====================
# AUTHENTICATION
# ====================
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRES_IN=30d
SESSION_SECRET=your_session_secret_key

# ====================
# GOOGLE OAUTH
# ====================
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# ====================
# AI INTEGRATION (HUGGINGFACE)
# ====================
HUGGINGFACE_API_KEY=your_huggingface_api_token
HUGGINGFACE_MODEL=distilbert-base-uncased
HUGGINGFACE_API_URL=https://api-inference.huggingface.co/models
AI_MAX_TOKENS=150
AI_TEMPERATURE=0.7

# ====================
# FILE UPLOAD (CLOUDINARY)
# ====================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MAX_FILE_SIZE=5242880 # 5MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif

# ====================
# FRONTEND CONFIGURATION
# ====================
FRONTEND_URL=http://localhost:4200
CORS_ORIGIN=http://localhost:4200

# ====================
# RATE LIMITING
# ====================
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# ====================
# SECURITY
# ====================
BCRYPT_SALT_ROUNDS=12
TOKEN_BLACKLIST_CLEANUP_INTERVAL=3600000 # 1 hour

# ====================
# LOGGING
# ====================
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/                 # Configuration files
│   │   ├── database.js         # Database connection
│   │       
│   │
│   ├── models/                 # MongoDB models
│   │   ├── User.js            # User schema
│   │   ├── Recipe.js          # Recipe schema
│   │   ├── Category.js        # Category schema
│   │   ├── Favorite.js        # Favorite recipes
│   │   └── Activity.js           # user Activity 
│   │
│   ├── routes/                 # API routes
│   │   ├── auth/              # Authentication routes
│   │   │   ├── googleAuth.js
│   │   │   └── localAuth.js
│   │   ├── recipes/           # Recipe CRUD operations
│   │   ├── categories/        # Category management
│   │   ├── favorites/         # Favorite recipes
│   │   ├── ai/                # AI assistant endpoints
│   │   └── upload/            # File upload endpoints
│   │
│   ├── controllers/           # Route controllers
│   │   ├── authController.js
│   │   ├── recipeController.js
│   │   ├── oauthController.js
│   │   └── profileController.js
│   │
│   ├── middleware/            # Custom middleware
│   │   ├── auth.js           # Authentication middleware
│   │   ├── authMiddleware.js    
│   │   ├── cros.js
│   │   ├── dbMiddleware.js
│   │   └── Upload.js     # File upload handling
│   │
│   ├── services/             # Business logic
│   │   ├── authService.js
│   │   ├── recipeService.js
│   │   ├── huggingfaceService.js      # HuggingFace integration
│   │   ├── emailService.js
│   │
│   ││   │
│
├── tests/                   # Test files
│   ├── tesst-uploads.js
│
├── public/                  # Static files
│   └── uploads/
│
├── logs/                    # Application logs
│
├── .env.example             # Environment variables template
├── .env                     # Environment variables (git-ignored)
├── package.json
├── package-lock.json
├── server.js               # Application entry point
├── render.yaml             # Render deployment config
└── README.md
```

---

## 📚 API Documentation

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-backend.onrender.com/api`

### Authentication
All endpoints except public routes require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

### Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## 🔐 Authentication

### Google OAuth Flow
1. User clicks "Login with Google"
2. Redirect to Google consent screen
3. Google returns authorization code
4. Exchange code for tokens
5. Create/update user in database
6. Issue JWT token

### JWT Implementation
- Access Token: Short-lived (15 minutes)
- Refresh Token: Long-lived (7 days)
- Token rotation on refresh
- Token blacklisting for logout

### Protected Routes Example
```javascript
// Middleware usage
router.get('/profile', authenticate, getUserProfile);

// Controller
const getUserProfile = async (req, res) => {
  // req.user contains decoded JWT payload
  const user = await User.findById(req.user.id);
  res.json(user);
};
```

---

## 🗄️ Database Models

### User Model
```javascript
{
  googleId: String,           // Google OAuth ID
  email: String,              // User email
  name: String,               // Full name
  avatar: String,             // Profile picture URL
  role: {                     // User role
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  preferences: {              // User preferences
    dietaryRestrictions: [String],
    favoriteCuisines: [String],
    cookingSkill: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Recipe Model
```javascript
{
  title: String,              // Recipe title
  description: String,        // Short description
  ingredients: [{             // List of ingredients
    name: String,
    quantity: String,
    unit: String
  }],
  instructions: [String],     // Step-by-step instructions
  prepTime: Number,           // Preparation time in minutes
  cookTime: Number,           // Cooking time in minutes
  servings: Number,           // Number of servings
  difficulty: {               // Difficulty level
    type: String,
    enum: ['easy', 'medium', 'hard']
  },
  category: {                 // Reference to Category
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  images: [String],           // Array of image URLs
  createdBy: {                // Reference to User
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  averageRating: Number,      // Average rating
  nutrition: {                // Nutritional information
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  tags: [String],             // Search tags
  isPublished: Boolean,       // Published status
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🤖 AI Integration

### HuggingFace Service
The AI service integrates with HuggingFace models for:
- Recipe suggestions based on ingredients
- Cooking tips and techniques
- Ingredient substitution recommendations
- Recipe difficulty analysis

### AI Service Configuration
```javascript
// Example AI service implementation
class AIService {
  constructor() {
    this.headers = {
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json'
    };
  }

  async getCookingSuggestions(prompt) {
    const response = await axios.post(
      `${process.env.HUGGINGFACE_API_URL}/${process.env.HUGGINGFACE_MODEL}`,
      {
        inputs: prompt,
        parameters: {
          max_length: process.env.AI_MAX_TOKENS,
          temperature: process.env.AI_TEMPERATURE
        }
      },
      { headers: this.headers }
    );
    return response.data;
  }
}
```

### Available AI Endpoints
- `POST /api/ai/suggest-recipes` - Get recipe suggestions
- `POST /api/ai/cooking-tips` - Get cooking tips
- `POST /api/ai/substitute` - Find ingredient substitutes
- `POST /api/ai/analyze-recipe` - Analyze recipe difficulty

---

## 🚀 Running Locally

### Development Mode
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start MongoDB (if using locally)
mongod --dbpath /path/to/data/db

# Run in development mode with hot reload
npm run dev

# Server runs on http://localhost:3000
```

### Production Mode
```bash
# Build for production
npm run build

# Start production server
npm start

# Or using PM2 (recommended for production)
npm install -g pm2
pm2 start server.js --name "recipe-backend"
```

### Docker Support
```bash
# Build Docker image
docker build -t recipe-backend .

# Run container
docker run -p 3000:3000 --env-file .env recipe-backend

# Docker Compose
docker-compose up
```

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

---

## 🧪 Testing

### Running Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Test Structure
```javascript
describe('Recipe Controller', () => {
  describe('GET /api/recipes', () => {
    it('should return all recipes', async () => {
      const res = await request(app)
        .get('/api/recipes')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });
});
```

---

## 🚢 Deployment

### 1. Prepare for Deployment
```bash
# Update package.json scripts
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "npm install --only=production",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}

# Create render.yaml for Render deployment
```

### 2. Deploy to Render
1. **Push to GitHub:**
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

2. **Deploy on Render:**
   - Connect GitHub repository
   - Configure build settings
   - Set environment variables
   - Deploy

### 3. Post-Deployment Checklist
- [ ] Verify database connection
- [ ] Test authentication flow
- [ ] Check CORS configuration
- [ ] Verify file uploads
- [ ] Test AI integration
- [ ] Monitor logs for errors

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/auth/google` | Initiate Google OAuth | No |
| GET | `/api/auth/google/callback` | Google OAuth callback | No |
| POST | `/api/auth/refresh` | Refresh JWT token | Yes |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/profile` | Get user profile | Yes |

### Recipes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/recipes` | Get all recipes | No |
| GET | `/api/recipes/:id` | Get recipe by ID | No |
| POST | `/api/recipes` | Create new recipe | Yes |
| PUT | `/api/recipes/:id` | Update recipe | Yes |
| DELETE | `/api/recipes/:id` | Delete recipe | Yes |
| GET | `/api/recipes/search` | Search recipes | No |
| GET | `/api/recipes/user/:userId` | Get user's recipes | Yes |

### Categories
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/categories` | Get all categories | No |
| POST | `/api/categories` | Create category | Yes (Admin) |
| PUT | `/api/categories/:id` | Update category | Yes (Admin) |
| DELETE | `/api/categories/:id` | Delete category | Yes (Admin) |

### Favorites
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/favorites` | Get user favorites | Yes |
| POST | `/api/favorites/:recipeId` | Add to favorites | Yes |
| DELETE | `/api/favorites/:recipeId` | Remove from favorites | Yes |

### AI Assistant
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/ai/suggest` | Get recipe suggestions | Yes |
| POST | `/api/ai/tips` | Get cooking tips | Yes |
| POST | `/api/ai/substitute` | Ingredient substitution | Yes |
| POST | `/api/ai/generate` | Generate recipe | Yes |

### Uploads
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/upload/image` | Upload image | Yes |
| DELETE | `/api/upload/:filename` | Delete uploaded file | Yes |


---

## 🛡️ Error Handling

### Error Types
```javascript
// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 400);
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 403);
  }
}
```

### Error Middleware
```javascript
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      success: false,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    res.status(err.statusCode).json({
      success: false,
      message: err.isOperational ? err.message : 'Something went wrong'
    });
  }
};
```

---

## 🔒 Security

### Implemented Security Measures
1. **Helmet.js** - Security headers
2. **CORS** - Cross-Origin Resource Sharing
3. **Rate Limiting** - Prevent brute force attacks
4. **Input Validation** - Joi validation
5. **SQL Injection Prevention** - Mongoose sanitization
6. **XSS Protection** - Input sanitization
7. **JWT Best Practices** - Short-lived tokens, secure storage
8. **Password Hashing** - bcrypt with salt rounds

### Security Headers
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.huggingface.co"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## ⚡ Performance Optimization

### Implemented Optimizations
1. **Database Indexing** - Improved query performance
2. **Query Optimization** - Lean queries, selective field projection
3. **Caching** - Redis/Memory cache for frequent queries
4. **Compression** - Gzip compression for responses
5. **Connection Pooling** - MongoDB connection management
6. **Lazy Loading** - Images and heavy assets

### Caching Strategy
```javascript
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = `__express__${req.originalUrl}` || req.url;
    const cachedBody = cache.get(key);
    
    if (cachedBody) {
      return res.send(cachedBody);
    }
    
    res.sendResponse = res.send;
    res.send = (body) => {
      cache.set(key, body, duration);
      res.sendResponse(body);
    };
    next();
  };
};
```

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Restart MongoDB service
sudo systemctl restart mongod

# Check logs
tail -f /var/log/mongodb/mongod.log
```

#### 2. Port Already in Use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

#### 3. Environment Variables Not Loading
```bash
# Check if .env file exists
ls -la .env

# Check variable values
echo $NODE_ENV

# Load environment manually
source .env && npm start
```

#### 4. JWT Authentication Issues
- Verify JWT_SECRET matches
- Check token expiration
- Validate token format
- Ensure Authorization header is set

#### 5. CORS Errors
```javascript
// Update CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 6. File Upload Issues
- Check Cloudinary credentials
- Verify file size limits
- Check allowed file types
- Ensure upload directory permissions

---

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. Push to the branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request

### Code Style
- Use ESLint for code linting
- Follow JavaScript Standard Style
- Write meaningful commit messages
- Add tests for new features

### Commit Message Convention
```
feat: add new recipe search endpoint
fix: resolve authentication token issue
docs: update API documentation
style: format code according to style guide
refactor: improve database query performance
test: add unit tests for user service
chore: update dependencies
```

---


## 📞 Support & Contact

For support, email [mineonu12@gmail.com] or join our Discord community.

- **Documentation**: [https://docs.example.com](https://docs.example.com)
- **API Reference**: [https://api.example.com/docs](https://api.example.com/docs)
- **Issue Tracker**: [https://github.com/yourusername/food-recipe-backend/issues](https://github.com/yourusername/food-recipe-backend/issues)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

## 🎉 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - Database
- [HuggingFace](https://huggingface.co/) - AI models
- [Google Cloud](https://cloud.google.com/) - OAuth provider
- [Render](https://render.com/) - Deployment platform

---

**Happy Cooking! 👨‍🍳👩‍🍳**

