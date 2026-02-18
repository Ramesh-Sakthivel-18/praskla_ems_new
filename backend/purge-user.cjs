
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function purgeUser() {
    const email = 'emp2@gmail.com';
    console.log(`Purging all records for ${email}...`);

    // 1. Delete from Firebase Auth
    try {
        const userRecord = await auth.getUserByEmail(email);
        await auth.deleteUser(userRecord.uid);
        console.log(`✅ Deleted from Auth: ${userRecord.uid}`);
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            console.log(`ℹ️ User not found in Auth (already deleted or never existed)`);
        } else {
            console.error('Error deleting from Auth:', e);
        }
    }

    // 2. Delete from Root Users Collection
    const rootSnapshot = await db.collection('users').where('email', '==', email).get();
    if (!rootSnapshot.empty) {
        const batch = db.batch();
        rootSnapshot.forEach(doc => {
            console.log(`Deleting from ROOT users: ${doc.id}`);
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ Deleted ${rootSnapshot.size} documents from ROOT users collection`);
    } else {
        console.log(`ℹ️ No documents found in ROOT users collection`);
    }

    // 3. Delete from ALL Organizations
    const orgsSnapshot = await db.collection('organizations').get();
    console.log(`Scanning ${orgsSnapshot.size} organizations...`);

    for (const orgDoc of orgsSnapshot.docs) {
        const usersSnapshot = await orgDoc.ref.collection('users').where('email', '==', email).get();
        if (!usersSnapshot.empty) {
            const batch = db.batch();
            usersSnapshot.forEach(doc => {
                console.log(`Deleting from Org [${orgDoc.data().name}] (${orgDoc.id}): ${doc.id}`);
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`✅ Deleted ${usersSnapshot.size} documents from Org [${orgDoc.data().name}]`);
        }
    }

    console.log('\nPurge complete.');
}

purgeUser().catch(console.error);
