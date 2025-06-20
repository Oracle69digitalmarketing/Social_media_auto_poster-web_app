// routes/posts.js
const express = require('express');
const pool = require('../db/pool');
const authenticateToken = require('../middlewares/auth');
const { publishPost } = require('../services/posting');

const router = express.Router();

// Create post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, title, hashtags, platforms, scheduledDate } = req.body;

    const result = await pool.query(
      `INSERT INTO posts (user_id, content, title, hashtags, platforms, scheduled_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.userId, content, title, hashtags, platforms, scheduledDate]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get all posts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Update a post
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, title, hashtags, platforms, scheduledDate } = req.body;

    const result = await pool.query(
      `UPDATE posts 
       SET content = $1, title = $2, hashtags = $3, platforms = $4, scheduled_date = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [content, title, hashtags, platforms, scheduledDate, id, req.user.userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Publish post now
router.post('/:id/publish', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const postResult = await pool.query(
      'SELECT * FROM posts WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (postResult.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    const post = postResult.rows[0];
    const results = await publishPost(post, req.user.userId);

    await pool.query(
      'UPDATE posts SET status = $1, posted_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['published', id]
    );

    res.json({ success: true, results });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

module.exports = router;
