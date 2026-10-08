require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });

const app = require('./app');
const connectDB = require('./config/db');

const required = ['MONGO_URI', 'JWT_SECRET', 'GROQ_API_KEY'];

module.exports = async function vercelHandler(req, res) {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    return res.status(500).json({ error: 'Server configuration is incomplete' });
  }

  try {
    await connectDB();
    if (!req.url.startsWith('/api')) req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    return app(req, res);
  } catch (error) {
    console.error(`Vercel API request failed: ${error.message}`);
    return res.status(503).json({ error: 'The API is temporarily unavailable' });
  }
};
