
const connectDB = require('../server/config/db');
const { app } = require('../server/server');

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const apiPath = url.searchParams.get('__path') || '';

    url.searchParams.delete('__path');
    req.url = `/api/${apiPath}${url.search}`;

    await connectDB();
    app(req, res);
  } catch (error) {
    console.error('API handler failed:', error);

    if (!res.headersSent) {
      res.status(503).json({ error: 'API unavailable' });
    }
  }
};
