# 🚀 Social Media Auto-Poster Backend

A Node.js/Express backend that enables users to authenticate, connect multiple social media accounts (LinkedIn, Twitter, Facebook), schedule posts, and manage accounts via a RESTful API.

---

## 📦 Features

- 🔐 JWT-based Authentication (Login, Register)
- 🔗 OAuth Integration (LinkedIn, Twitter, Facebook)
- 📅 Post Scheduling with `node-cron`
- 🗃️ PostgreSQL Database Integration
- ⚙️ Environment Variable Validation
- 📤 Auto-post to connected platforms
- 🧪 Unit + Integration Test Support (Jest-ready)

---

## 📁 Project Structure

. ├── routes/             # API route handlers ├── controllers/        # Controller logic ├── services/           # Business logic and API wrappers ├── middlewares/        # Middleware (auth, error handling) ├── models/             # DB init and schema ├── utils/              # Utility functions (env validation, helpers) ├── scripts/            # Utility or CLI scripts ├── tests/              # Jest test suites ├── public/             # Static assets ├── server.js           # App entry point ├── .env                # Environment variables ├── .gitignore
└── package.json

---

## 🛠️ Setup & Run

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/social-media-poster-backend.git
   cd social-media-poster-backend

2. Install dependencies

npm install


3. Set up .env Copy .env.example to .env and fill in all values.


4. Run the server

npm run dev




---

🧪 Testing

Run all test suites:

npm test


---

🔐 OAuth Setup

Configure the following in .env with your platform credentials:

LINKEDIN_CLIENT_ID=
TWITTER_CLIENT_ID=
FACEBOOK_CLIENT_ID=
...


---

🧠 Powered By

Express

PostgreSQL

node-cron

JWT

Axios

Jest



---

👨‍💻 Author

Adewumi Adewale
Founder @ Oracle69 Digital
📧 oracle69digital@gmail.com


---

🪪 License

MIT License

Would you like a shorter variant for frontend or docs version for contributors/devs?

