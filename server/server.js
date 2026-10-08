require('dotenv').config();

const connectDB = require('./config/db');
const app = require('./app');

const required = ['MONGO_URI', 'JWT_SECRET', 'GROQ_API_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  process.exit(1);
}

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
