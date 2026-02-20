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

  let serviceAccount;

  try {
    // Priority 1: Environment variable (for Render / production deployment)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('🔑 Loading Firebase credentials from environment variable...');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // Priority 2: Local file (for localhost development)
      const keyPath = path.join(__dirname, 'serviceAccountKey.json');
      console.log('🔑 Loading Firebase credentials from local file...');
      serviceAccount = require(keyPath);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin initialized successfully');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin.');
    console.error('⚠️  Set FIREBASE_SERVICE_ACCOUNT env variable OR ensure serviceAccountKey.json exists in backend folder.');
    console.error('Error:', err.message);
    process.exit(1);
  }

  return admin.app();
}

module.exports = initFirebaseAdmin;
