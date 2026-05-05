const { MongoClient } = require('mongodb');
const config = require('./config');

class PersistenceService {
  constructor() {
    this.uri = process.env.MONGODB_URI;
    this.dbName = 'angrezi_pitara';
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (this.db) return;
    if (!this.uri) {
      console.warn('⚠️ MONGODB_URI is not set. State will not be persistent!');
      return;
    }
    try {
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      console.log('✅ Connected to MongoDB for persistence.');
    } catch (err) {
      console.error('❌ MongoDB connection error:', err.message);
    }
  }

  async getState(key) {
    if (!this.db) return null;
    try {
      const collection = this.db.collection('automation_state');
      const doc = await collection.findOne({ _id: key });
      return doc ? doc.state : null;
    } catch (err) {
      console.error(`❌ Error fetching state for ${key}:`, err.message);
      return null;
    }
  }

  async saveState(key, state) {
    if (!this.db) return;
    try {
      const collection = this.db.collection('automation_state');
      await collection.updateOne(
        { _id: key },
        { $set: { state, updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.error(`❌ Error saving state for ${key}:`, err.message);
    }
  }
}

module.exports = new PersistenceService();
