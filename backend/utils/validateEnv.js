// utils/validateEnv.js
const requiredVars = [
  'PORT',
  'BASE_URL',
  'FRONTEND_URL',
  'JWT_SECRET',
  'DATABASE_URL',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET',
  'TWITTER_BEARER_TOKEN',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET',
];

function validateEnv() {
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

module.exports = validateEnv;
