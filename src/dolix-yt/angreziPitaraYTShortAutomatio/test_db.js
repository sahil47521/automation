const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://sahil47521_db_user:EuLSxHVywKjwIz4V@cluster0.klbnbfg.mongodb.net/himalayan-travel?retryWrites=true&w=majority";

async function testConnection() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("✅ MongoDB Connection Successful!");
    const db = client.db('angrezi_pitara');
    console.log("✅ Successfully accessed 'angrezi_pitara' database.");
    await client.close();
  } catch (err) {
    console.error("❌ Connection Failed:", err.message);
  }
}

testConnection();
