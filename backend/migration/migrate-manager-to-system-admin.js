/**
 * migrate-manager-to-system-admin.js
 * 
 * Migration script to update existing users with role 'manager' to 'system_admin'.
 * Run this script ONCE to update your live database.
 * 
 * HOW TO RUN:
 * node migration/migrate-manager-to-system-admin.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateManagerToSystemAdmin() {
    console.log('🚀 Starting migration: Manager -> System Admin');

    try {
        // 1. Check root users collection (System Users)
        console.log('🔍 Checking root "users" collection...');
        const usersSnapshot = await db.collection('users').where('role', '==', 'manager').get();

        if (usersSnapshot.empty) {
            console.log('✅ No users found with role "manager" in root users collection.');
        } else {
            console.log(`⚠️ Found ${usersSnapshot.size} manager(s) to update.`);

            const batch = db.batch();

            usersSnapshot.forEach(doc => {
                const user = doc.data();
                console.log(`   - Updating user: ${user.email} (${doc.id})`);
                batch.update(doc.ref, { role: 'system_admin' });
            });

            await batch.commit();
            console.log('✅ Updated all root users successfully.');
        }

        // 2. Check for potential misconfiguration in organizations (just in case)
        // Note: Usually managers are system-level, but safe to check
        console.log('🔍 Checking organization users (just in case)...');
        const orgsSnapshot = await db.collection('organizations').get();

        let totalOrgUpdates = 0;

        for (const orgDoc of orgsSnapshot.docs) {
            const orgUsers = await orgDoc.ref.collection('users').where('role', '==', 'manager').get();

            if (!orgUsers.empty) {
                console.log(`⚠️ Found ${orgUsers.size} manager(s) in organization ${orgDoc.id}`);
                const batch = db.batch();
                orgUsers.forEach(doc => {
                    batch.update(doc.ref, { role: 'system_admin' });
                });
                await batch.commit();
                totalOrgUpdates += orgUsers.size;
            }
        }

        if (totalOrgUpdates === 0) {
            console.log('✅ No organization users found with role "manager".');
        } else {
            console.log(`✅ Updated ${totalOrgUpdates} users in organizations.`);
        }

        console.log('\n🎉 MIGRATION COMPLETE!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateManagerToSystemAdmin();
