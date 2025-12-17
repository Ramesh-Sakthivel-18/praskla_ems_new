const admin = require('firebase-admin');
const path = require('path');

function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length) return admin.app();

  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  try {
    const serviceAccount = require(keyPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized');
  } catch (err) {
    console.error('Failed to initialize Firebase Admin. Ensure serviceAccountKey.json exists in backend folder.', err.message);
    process.exit(1);
  }

  return admin.app();
}

module.exports = initFirebaseAdmin;
