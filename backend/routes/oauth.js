// routes/oauth.js
const express = require('express');
const pool = require('../db/pool');
const authenticateToken = require('../middlewares/auth');
const { SOCIAL_APIS, getScope, exchangeCodeForToken } = require('../services/oauth');

const router = express.Router();

// Get OAuth URL
router.get('/:platform', authenticateToken, (req, res) => {
  const { platform } = req.params;
  const config = SOCIAL_APIS[platform];
  if (!config) return res.status(400).json({ error: 'Unsupported platform' });

  const params = new URLSearchParams({
    client_id: process.env[`${platform.toUpperCase()}_CLIENT_ID`],
    redirect_uri: `${process.env.BASE_URL}/api/oauth/${platform}/callback`,
    response_type: 'code',
    state: req.user.userId,
    scope: getScope(platform),
  });

  res.json({ authUrl: `${config.authUrl}?${params}` });
});

// OAuth callback
router.get('/:platform/callback', async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, state } = req.query;
    const userId = parseInt(state);

    const tokenResponse = await exchangeCodeForToken(platform, code);

    await pool.query(
      `INSERT INTO social_accounts (user_id, platform, access_token, refresh_token, token_expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, platform) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         is_active = true`,
      [
        userId,
        platform,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.expires_at,
      ]
    );

    res.redirect(`${process.env.FRONTEND_URL}?connected=${platform}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=oauth_failed`);
  }
});

module.exports = router;
