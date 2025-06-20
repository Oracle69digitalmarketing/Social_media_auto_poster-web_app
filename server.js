// server.js
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const dotenv = require('dotenv');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const { initDatabase } = require('./models/init');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const oauthRoutes = require('./routes/oauth');
const accountRoutes = require('./routes/accounts');
const { handleScheduledPosts } = require('./services/scheduler');
const errorHandler = require('./middlewares/errorHandler');

// app.js
const dotenv = require('dotenv');
dotenv.config();

const validateEnv = require('./utils/validateEnv');
validateEnv();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Core middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/accounts', accountRoutes);

// Swagger API Docs
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Social Media Poster API',
      version: '1.0.0',
      description: 'API documentation for backend services',
    },
    servers: [{ url: process.env.BASE_URL }],
  },
  apis: ['./routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error middleware
app.use(errorHandler);

// Init DB and start
initDatabase().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

// Background job scheduler
cron.schedule('* * * * *', handleScheduledPosts);

module.exports = app;
