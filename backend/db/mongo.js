const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'ems';

const client = new MongoClient(MONGODB_URI);
const dbInstance = client.db(DB_NAME);

async function connectDB() {
  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB successfully. Database: ${DB_NAME}`);
    return dbInstance;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

function getDB() {
  return dbInstance;
}

module.exports = { connectDB, getDB, client };
