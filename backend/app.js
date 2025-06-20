// app.js
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const dotenv = require('dotenv');
const path = require('path');

const { initDatabase } = require('./models/init');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const oauthRoutes = require('./routes/oauth');
const accountRoutes = require('./routes/accounts');
const errorHandler = require('./middlewares/errorHandler');
const { handleScheduledPosts } = require('./services/scheduler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/accounts', accountRoutes);

// Error Handler
app.use(errorHandler);

// Start server after initializing DB
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

// Schedule background jobs
cron.schedule('* * * * *', handleScheduledPosts);

module.exports = app;
