// routes/accounts.js
const express = require('express');
const pool = require('../db/pool');
const authenticateToken = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT platform, is_active FROM social_accounts WHERE user_id = $1',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

module.exports = router;
