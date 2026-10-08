const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});
app.get('/api', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/interviews', require('./routes/interviews'));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error('Request error:', error);
  if (res.headersSent) return next(error);

  if (error.code === 11000) return res.status(409).json({ error: 'Email already registered' });
  if (error.name === 'ValidationError') return res.status(400).json({ error: 'Invalid request data' });
  if (error.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  return res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
