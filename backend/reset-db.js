
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

async function listUsersAndDelete() {
    console.log('Fetching users to delete from Auth...');
    try {
        const listUsersResult = await auth.listUsers(1000);
        const uids = listUsersResult.users.map(user => user.uid);
        if (uids.length > 0) {
            console.log(`Deleting ${uids.length} users from Auth...`);
            await auth.deleteUsers(uids);
            console.log('✅ Auth users deleted.');
        } else {
            console.log('ℹ️ No Auth users found.');
        }
    } catch (error) {
        console.error('Error deleting Auth users:', error);
    }
}

async function resetDatabase() {
    console.log('⚠️ STARTING DATABASE RESET...');

    try {
        // 1. Delete All Collections (Recursive)
        console.log('Fetching all collections...');
        const collections = await db.listCollections();

        if (collections.length === 0) {
            console.log('ℹ️ No collections found.');
        } else {
            console.log(`Found ${collections.length} collections. Deleting recursively...`);
            for (const collection of collections) {
                console.log(`Deleting collection: ${collection.id}...`);
                // Use recursiveDelete to delete documents and subcollections
                await db.recursiveDelete(collection);
                console.log(`✅ Deleted ${collection.id}`);
            }
        }

        // 2. Delete Auth Users
        await listUsersAndDelete();

        console.log('\n✅ DATABASE RESET COMPLETE.');
    } catch (error) {
        console.error('❌ Error resetting database:', error);
    }
}

resetDatabase().catch(console.error);
