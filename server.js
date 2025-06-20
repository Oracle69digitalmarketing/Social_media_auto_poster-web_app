// server.js

// Load environment variables and validate them
const dotenv = require('dotenv');
dotenv.config();
require('./utils/validateEnv');

// Core modules
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

// Database and route initializers
const { initDatabase } = require('./models/init');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const oauthRoutes = require('./routes/oauth');
const accountRoutes = require('./routes/accounts');

// Scheduled job handler
const { handleScheduledPosts } = require('./services/scheduler');

// Global error handler
const errorHandler = require('./middlewares/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serves static frontend files from /public

// Route definitions
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/accounts', accountRoutes);

// Error handling middleware (should come after all routes)
app.use(errorHandler);

// Initialize DB and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
});

// Schedule cron job for auto-posting every minute
cron.schedule('* * * * *', handleScheduledPosts);

module.exports = app;
