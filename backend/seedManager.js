// seedManager.js
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs'); // Or whatever hashing you use
// Initialize your firebase app here if not already global, or import your db config
const serviceAccount = require('./serviceAccountKey.json'); 

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function createManager() {
  const email = "praskla@gmail.com";
  const password = "123456"; // In real life, hash this!
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // 1. Create in Firebase Auth (optional, if you use Firebase Auth)
    // const userRecord = await admin.auth().createUser({ email, password });
    
    // 2. Create in Firestore Users Collection
    await db.collection('users').doc('manager_001').set({
      email: email,
      password: hashedPassword, // Store hashed
      role: 'manager',
      name: 'Super Manager',
      createdAt: new Date().toISOString()
    });

    console.log('Manager created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating manager:', error);
    process.exit(1);
  }
}

createManager();
