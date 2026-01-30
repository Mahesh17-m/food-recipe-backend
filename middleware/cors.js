const corsOptions = {
    origin: 'http://localhost:4200', // or your Angular app URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  
  module.exports = corsOptions;