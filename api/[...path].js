const connectDB = require('../server/config/db');
const { app } = require('../server/server');

module.exports = async function handler(req, res) {
  try {
    await connectDB();
    app(req, res);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    res.status(503).json({ error: 'Database unavailable' });
  }
};
