// services/publisher.js
const axios = require('axios');
const pool = require('../db/pool');

async function publishPost(post, userId) {
  const results = [];

  const accountsResult = await pool.query(
    'SELECT * FROM social_accounts WHERE user_id = $1 AND platform = ANY($2) AND is_active = true',
    [userId, post.platforms]
  );

  for (const account of accountsResult.rows) {
    try {
      const result = await postToSocialMedia(account, post);

      await pool.query(
        `INSERT INTO post_results (post_id, platform, platform_post_id, success)
         VALUES ($1, $2, $3, $4)`,
        [post.id, account.platform, result.id, true]
      );

      results.push({ platform: account.platform, success: true, id: result.id });
    } catch (error) {
      console.error(`Failed to post to ${account.platform}:`, error);

      await pool.query(
        `INSERT INTO post_results (post_id, platform, success, error_message)
         VALUES ($1, $2, $3, $4)`,
        [post.id, account.platform, false, error.message]
      );

      results.push({ platform: account.platform, success: false, error: error.message });
    }
  }

  return results;
}

async function postToSocialMedia(account, post) {
  const fullContent = `${post.title ? post.title + '\n\n' : ''}${post.content}${post.hashtags ? '\n\n' + post.hashtags : ''}`;

  switch (account.platform) {
    case 'linkedin':
      return await postToLinkedIn(account.access_token, fullContent);
    case 'twitter':
      return await postToTwitter(account.access_token, fullContent);
    case 'facebook':
      return await postToFacebook(account.access_token, fullContent);
    default:
      throw new Error(`Unsupported platform: ${account.platform}`);
  }
}

async function postToLinkedIn(accessToken, content) {
  const authorId = await getLinkedInPersonId(accessToken);

  const response = await axios.post(
    'https://api.linkedin.com/v2/ugcPosts',
    {
      author: `urn:li:person:${authorId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return { id: response.data.id };
}

async function postToTwitter(accessToken, content) {
  const response = await axios.post(
    'https://api.twitter.com/2/tweets',
    { text: content },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return { id: response.data.data.id };
}

async function postToFacebook(accessToken, content) {
  const response = await axios.post(
    'https://graph.facebook.com/v18.0/me/feed',
    { message: content },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return { id: response.data.id };
}

async function getLinkedInPersonId(accessToken) {
  const response = await axios.get('https://api.linkedin.com/v2/people/~', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data.id;
}

module.exports = {
  publishPost,
};
