/**
 * delete-all-collections.js
 * 
 * DANGER: This script DELETES ALL data from Firestore.
 * Use this to start fresh with the new hierarchical structure.
 * 
 * HOW TO RUN:
 * node migration/delete-all-collections.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Collections to delete
const COLLECTIONS_TO_DELETE = [
  'users',
  'attendance',
  'leaves',
  'statistics',
  'organizations',
  'employees',
  'admins',
  'businessowners',
  'business_owners'
  // Add any other collection names you have
];

/**
 * Delete a collection in batches
 */
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.limit(500);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query, resolve, reject) {
  try {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
      resolve();
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`  ✓ Deleted ${snapshot.size} documents`);

    // Recurse on the next batch
    process.nextTick(() => {
      deleteQueryBatch(query, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

/**
 * Main deletion function
 */
async function deleteAllCollections() {
  console.log('🔥 FIRESTORE CLEANUP SCRIPT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  WARNING: This will DELETE ALL DATA from Firestore!');
  console.log('');
  console.log('Collections to be deleted:');
  COLLECTIONS_TO_DELETE.forEach(col => console.log(`  - ${col}`));
  console.log('');
  console.log('⏳ Starting in 5 seconds... (Press Ctrl+C to cancel)');
  console.log('');

  // Wait 5 seconds to allow cancellation
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🚀 Starting deletion...\n');

  for (const collectionName of COLLECTIONS_TO_DELETE) {
    try {
      console.log(`📂 Deleting collection: ${collectionName}`);
      await deleteCollection(collectionName);
      console.log(`✅ Collection '${collectionName}' deleted\n`);
    } catch (error) {
      console.error(`❌ Error deleting collection '${collectionName}':`, error.message);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ALL COLLECTIONS DELETED!');
  console.log('🎉 Your Firestore is now clean and ready for new structure');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Use the seeding script to create sample data');
  console.log('  2. Or register a new organization via API');
  
  process.exit(0);
}

// Run the deletion
deleteAllCollections().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
