const corsOptions = {
  origin: [
    'https://food-recipe-frontend-rust.vercel.app',  // Vercel frontend
    'https://food-recipe-frontend.vercel.app',       // Alternative Vercel domain
    'http://localhost:4200',                         // Local development
    'http://localhost:5000'                          // Backend local testing
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

module.exports = corsOptions;