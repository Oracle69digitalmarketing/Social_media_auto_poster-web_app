const axios = require('axios');

const SOCIAL_APIS = {
  linkedin: {
    baseUrl: 'https://api.linkedin.com/v2',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  },
  twitter: {
    baseUrl: 'https://api.twitter.com/2',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
  },
  facebook: {
    baseUrl: 'https://graph.facebook.com/v18.0',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
  },
};

function getScope(platform) {
  const scopes = {
    linkedin: 'r_liteprofile,w_member_social',
    twitter: 'tweet.read,tweet.write,users.read',
    facebook: 'pages_manage_posts,pages_read_engagement',
  };
  return scopes[platform] || '';
}

async function exchangeCodeForToken(platform, code) {
  const config = SOCIAL_APIS[platform];
  const params = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.BASE_URL}/api/oauth/${platform}/callback`,
    client_id: process.env[`${platform.toUpperCase()}_CLIENT_ID`],
    client_secret: process.env[`${platform.toUpperCase()}_CLIENT_SECRET`],
  };

  const response = await axios.post(config.tokenUrl, params);
  return {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
    expires_at: response.data.expires_in
      ? new Date(Date.now() + response.data.expires_in * 1000)
      : null,
  };
}

module.exports = {
  SOCIAL_APIS,
  getScope,
  exchangeCodeForToken,
};
