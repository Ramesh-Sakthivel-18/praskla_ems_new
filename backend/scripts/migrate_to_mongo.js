const { connectDB } = require('../db/mongo');

async function setupIndexes() {
  try {
    const db = await connectDB();
    console.log('⏳ Setting up MongoDB Indexes...');

    // users: uid, email
    await db.collection('users').createIndex({ uid: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });

    // organizations: id, ownerEmail
    await db.collection('organizations').createIndex({ id: 1 }, { unique: true, sparse: true });
    await db.collection('organizations').createIndex({ ownerEmail: 1 }, { sparse: true });

    // departments: organizationId
    await db.collection('departments').createIndex({ organizationId: 1 });

    // attendance: userId, date
    await db.collection('attendance').createIndex({ userId: 1, date: 1 });
    
    // leaves: userId
    await db.collection('leaves').createIndex({ userId: 1 });

    console.log('✅ Indexes successfully created!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create indexes:', err);
    process.exit(1);
  }
}

setupIndexes();
