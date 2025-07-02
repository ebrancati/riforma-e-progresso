import { MongoClient } from 'mongodb';
import { config } from '../config/config.js';

let db = null;
let client = null;

export async function connectToDatabase() {
  try {
    if (db) return db;

    client = new MongoClient(config.mongoUri);
    await client.connect();
    db = client.db(config.dbName);
    
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}

export function getCollection(collectionName) {
  const database = getDatabase();
  return database.collection(collectionName);
}

export async function closeConnection() {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log('MongoDB connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});