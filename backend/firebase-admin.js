/**
 * firebase-admin.js
 * 
 * Initializes Firebase Admin SDK.
 * Singleton pattern - initializes only once.
 */

const admin = require('firebase-admin');
const path = require('path');

function initFirebaseAdmin() {
  // Check if already initialized
  if (admin.apps && admin.apps.length) {
    console.log('✅ Firebase Admin already initialized');
    return admin.app();
  }

  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  
  try {
    const serviceAccount = require(keyPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin.');
    console.error('⚠️  Ensure serviceAccountKey.json exists in backend folder.');
    console.error('Error:', err.message);
    process.exit(1);
  }

  return admin.app();
}

module.exports = initFirebaseAdmin;
