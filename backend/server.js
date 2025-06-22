// server.js - Main Express server
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/social-media-poster', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Database Models
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    socialAccounts: {
        linkedin: {
            accessToken: String,
            refreshToken: String,
            expiresAt: Date,
            profileId: String
        },
        twitter: {
            accessToken: String,
            refreshToken: String,
            expiresAt: Date,
            profileId: String
        },
        facebook: {
            accessToken: String,
            refreshToken: String,
            expiresAt: Date,
            profileId: String
        },
        instagram: {
            accessToken: String,
            refreshToken: String,
            expiresAt: Date,
            profileId: String
        }
    },
    createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    title: String,
    hashtags: String,
    platforms: [String],
    scheduledDate: Date,
    status: { 
        type: String, 
        enum: ['draft', 'scheduled', 'posted', 'failed'],
        default: 'draft'
    },
    postResults: [{
        platform: String,
        success: Boolean,
        postId: String,
        error: String,
        postedAt: Date
    }],
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.userId = user.userId;
        next();
    });
};

// Social Media API clients
class LinkedInAPI {
    static async postContent(accessToken, content, title = '') {
        const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            body: JSON.stringify({
                author: 'urn:li:person:PROFILE_ID', // Replace with actual profile ID
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: `${title ? title + '\n\n' : ''}${content}`
                        },
                        shareMediaCategory: 'NONE'
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            })
        });
        
        return await response.json();
    }

    static async refreshToken(refreshToken) {
        const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET
            })
        });
        
        return await response.json();
    }
}

class TwitterAPI {
    static async postTweet(accessToken, content) {
        const response = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: content })
        });
        
        return await response.json();
    }
}

class FacebookAPI {
    static async postToPage(accessToken, pageId, content) {
        const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: content,
                access_token: accessToken
            })
        });
        
        return await response.json();
    }
}

// Routes

// User Authentication
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback-secret');
        res.json({ token, user: { id: user._id, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback-secret');
        res.json({ token, user: { id: user._id, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// OAuth Routes
app.get('/api/auth/:platform', authenticateToken, (req, res) => {
    const { platform } = req.params;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/${platform}/callback`;
    
    const oauthUrls = {
        linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=r_liteprofile%20r_emailaddress%20w_member_social`,
        twitter: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read&state=${req.userId}`,
        facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_manage_posts,pages_read_engagement`
    };

    if (oauthUrls[platform]) {
        res.json({ authUrl: oauthUrls[platform] });
    } else {
        res.status(400).json({ error: 'Unsupported platform' });
    }
});

app.get('/api/auth/:platform/callback', async (req, res) => {
    try {
        const { platform } = req.params;
        const { code, state } = req.query;
        
        // Exchange code for access token (implementation varies by platform)
        // This is a simplified example for LinkedIn
        if (platform === 'linkedin') {
            const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/linkedin/callback`,
                    client_id: process.env.LINKEDIN_CLIENT_ID,
                    client_secret: process.env.LINKEDIN_CLIENT_SECRET
                })
            });
            
            const tokenData = await tokenResponse.json();
            
            // Save tokens to user account
            await User.findByIdAndUpdate(state, {
                [`socialAccounts.${platform}.accessToken`]: tokenData.access_token,
                [`socialAccounts.${platform}.refreshToken`]: tokenData.refresh_token,
                [`socialAccounts.${platform}.expiresAt`]: new Date(Date.now() + tokenData.expires_in * 1000)
            });
        }
        
        res.redirect('/auth-success.html');
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Post Management
app.post('/api/posts', authenticateToken, async (req, res) => {
    try {
        const { content, title, hashtags, platforms, scheduledDate, status } = req.body;
        
        const post = new Post({
            userId: req.userId,
            content,
            title,
            hashtags,
            platforms,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
            status: status || 'draft'
        });
        
        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/posts', authenticateToken, async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/posts/:id', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            req.body,
            { new: true }
        );
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Immediate posting
app.post('/api/posts/:id/publish', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.userId });
        const user = await User.findById(req.userId);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        const results = [];
        
        for (const platform of post.platforms) {
            try {
                let result;
                const tokens = user.socialAccounts[platform];
                
                if (!tokens || !tokens.accessToken) {
                    results.push({
                        platform,
                        success: false,
                        error: 'Account not connected'
                    });
                    continue;
                }
                
                const fullContent = `${post.title ? post.title + '\n\n' : ''}${post.content}${post.hashtags ? '\n\n' + post.hashtags : ''}`;
                
                switch (platform) {
                    case 'linkedin':
                        result = await LinkedInAPI.postContent(tokens.accessToken, post.content, post.title);
                        break;
                    case 'twitter':
                        result = await TwitterAPI.postTweet(tokens.accessToken, fullContent.substring(0, 280));
                        break;
                    case 'facebook':
                        result = await FacebookAPI.postToPage(tokens.accessToken, tokens.profileId, fullContent);
                        break;
                    default:
                        throw new Error('Unsupported platform');
                }
                
                results.push({
                    platform,
                    success: !result.error,
                    postId: result.id || result.data?.id,
                    error: result.error?.message,
                    postedAt: new Date()
                });
                
            } catch (error) {
                results.push({
                    platform,
                    success: false,
                    error: error.message,
                    postedAt: new Date()
                });
            }
        }
        
        post.postResults = results;
        post.status = results.every(r => r.success) ? 'posted' : 'failed';
        await post.save();
        
        res.json({ post, results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Scheduled posting cron job
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const scheduledPosts = await Post.find({
            status: 'scheduled',
            scheduledDate: { $lte: now }
        }).populate('userId');
        
        for (const post of scheduledPosts) {
            // Trigger the publishing logic
            const user = post.userId;
            const results = [];
            
            for (const platform of post.platforms) {
                try {
                    const tokens = user.socialAccounts[platform];
                    if (!tokens || !tokens.accessToken) continue;
                    
                    const fullContent = `${post.title ? post.title + '\n\n' : ''}${post.content}${post.hashtags ? '\n\n' + post.hashtags : ''}`;
                    
                    let result;
                    switch (platform) {
                        case 'linkedin':
                            result = await LinkedInAPI.postContent(tokens.accessToken, post.content, post.title);
                            break;
                        case 'twitter':
                            result = await TwitterAPI.postTweet(tokens.accessToken, fullContent.substring(0, 280));
                            break;
                        case 'facebook':
                            result = await FacebookAPI.postToPage(tokens.accessToken, tokens.profileId, fullContent);
                            break;
                    }
                    
                    results.push({
                        platform,
                        success: !result.error,
                        postId: result.id || result.data?.id,
                        error: result.error?.message,
                        postedAt: new Date()
                    });
                } catch (error) {
                    results.push({
                        platform,
                        success: false,
                        error: error.message,
                        postedAt: new Date()
                    });
                }
            }
            
            post.postResults = results;
            post.status = results.every(r => r.success) ? 'posted' : 'failed';
            await post.save();
        }
    } catch (error) {
        console.error('Scheduled posting error:', error);
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
