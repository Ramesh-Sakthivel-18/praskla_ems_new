const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/ems');
  try {
    await client.connect();
    const db = client.db('ems');
    
    // Find departments with invalid { operand: 1 } memberCount object and reset them to 0
    const filter = { 'memberCount.operand': { $exists: true } };
    const update = [{ $set: { memberCount: 0 } }];
    const result = await db.collection('departments').updateMany(filter, update);
    
    console.log(`✅ Fixed ${result.modifiedCount} invalid department records in MongoDB.`);
  } catch (error) {
    console.error('❌ Error during DB fix:', error);
  } finally {
    await client.close();
  }
}

run();
