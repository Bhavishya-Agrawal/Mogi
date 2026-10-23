require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/interviews', require('./routes/interviews'));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handler
app.use((error, req, res, next) => {
  console.error('Request error:', error);
  if (res.headersSent) return next(error);

  if (error.code === 11000) return res.status(409).json({ error: 'Email already registered' });
  if (error.name === 'ValidationError') return res.status(400).json({ error: 'Invalid request data' });
  if (error.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  return res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Mogi API running on port ${PORT}`));
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exitCode = 1;
  }
}

startServer();
