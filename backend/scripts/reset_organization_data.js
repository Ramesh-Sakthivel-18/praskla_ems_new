/**
 * reset_organization_data.js
 * 
 * destructive script to delete all organization records
 * preserves system-admin accounts (Firestore & Auth)
 * 
 * Usage: node reset_organization_data.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function resetOrganizationData() {
    console.log('⚠️ STARTING ORGANIZATION DATA RESET...');
    console.log('⚠️ THIS WILL DELETE ALL ORGANIZATIONS, EMPLOYEES, ATTENDANCE, AND LEAVES.');
    console.log('⚠️ SYSTEM ADMIN ACCOUNTS WILL BE PRESERVED.\n');

    try {
        // 1. Identify System Admins to preserve
        console.log('🔍 Identifying system users to preserve...');
        const usersSnapshot = await db.collection('users').get();
        const systemUids = new Set();
        const systemEmails = new Set();

        usersSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.isSystemUser === true || data.role === 'system_admin') {
                systemUids.add(doc.id);
                systemEmails.add(data.email?.toLowerCase());
                console.log(`ℹ️ Preserving system user: ${data.email} (${doc.id})`);
            }
        });

        // 2. Delete non-system users from Firestore root
        console.log('\n👥 Cleaning root users collection...');
        let deletedUserDocs = 0;
        for (const doc of usersSnapshot.docs) {
            if (!systemUids.has(doc.id)) {
                await doc.ref.delete();
                deletedUserDocs++;
            }
        }
        console.log(`✅ Deleted ${deletedUserDocs} non-system user documents from Firestore.`);

        // 3. Delete non-system users from Firebase Auth
        console.log('\n🔐 Cleaning Firebase Authentication...');
        let deletedAuthUsers = 0;
        let nextPageToken;

        do {
            const listUsersResult = await auth.listUsers(1000, nextPageToken);
            for (const userRecord of listUsersResult.users) {
                const email = userRecord.email?.toLowerCase();
                const uid = userRecord.uid;

                if (!systemEmails.has(email) && !systemUids.has(uid)) {
                    await auth.deleteUser(uid);
                    deletedAuthUsers++;
                }
            }
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        console.log(`✅ Deleted ${deletedAuthUsers} non-system users from Firebase Auth.`);

        // 4. Delete all organizations (recursive delete subcollections)
        console.log('\n🏢 Cleaning organizations collection (including all sub-data)...');
        const orgsSnapshot = await db.collection('organizations').get();
        let deletedOrgs = 0;

        for (const doc of orgsSnapshot.docs) {
            console.log(`   Deleting organization: ${doc.id} (${doc.data().name || 'Unknown'})`);
            await db.recursiveDelete(doc.ref);
            deletedOrgs++;
        }
        console.log(`✅ Deleted ${deletedOrgs} organizations and all their sub-data.`);

        // 5. Delete other root collections that might have data (if any)
        // Check for loose attendance/leaves at root (though our schema is hierarchical)
        const rootCollections = await db.listCollections();
        for (const collection of rootCollections) {
            if (['attendance', 'leaves', 'statistics', 'audit_logs', 'notifications'].includes(collection.id)) {
                console.log(`\n📦 Cleaning root collection: ${collection.id}...`);
                await db.recursiveDelete(collection);
                console.log(`✅ Deleted root collection: ${collection.id}`);
            }
        }

        console.log('\n========================================');
        console.log('✨ ORGANIZATION DATA RESET COMPLETE!');
        console.log('✅ System admin accounts are ready for use.');
        console.log('========================================');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Reset failed:', error);
        process.exit(1);
    }
}

resetOrganizationData();
