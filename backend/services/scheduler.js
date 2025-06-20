// services/scheduler.js
const pool = require('../db/pool');
const { publishPost } = require('./publisher');

async function handleScheduledPosts() {
  try {
    const now = new Date();

    const result = await pool.query(
      `SELECT p.*, u.id AS user_id
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.status = 'scheduled' AND p.scheduled_date <= $1`,
      [now]
    );

    for (const post of result.rows) {
      console.log(`Processing scheduled post ${post.id}`);

      try {
        await publishPost(post, post.user_id);

        await pool.query(
          'UPDATE posts SET status = $1, posted_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['published', post.id]
        );

        console.log(`Successfully published post ${post.id}`);
      } catch (error) {
        console.error(`Failed to publish scheduled post ${post.id}:`, error);

        await pool.query(
          'UPDATE posts SET status = $1 WHERE id = $2',
          ['failed', post.id]
        );
      }
    }
  } catch (error) {
    console.error('Scheduled posting error:', error);
  }
}

module.exports = {
  handleScheduledPosts,
};
