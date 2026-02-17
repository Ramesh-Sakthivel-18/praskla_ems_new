const admin = require('firebase-admin');
const path = require('path');
const bcrypt = require('bcryptjs'); // Add bcrypt

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function createSystemAdmin() {
    console.log('🚀 Creating System Admin User...');

    const email = process.argv[2] || 'system.admin@hikvision.com';
    const password = process.argv[3] || 'SysAdmin@123';
    const name = 'System Administrator';

    try {
        // 1. Check if user already exists in Auth
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
            console.log(`⚠️ User ${email} already exists in Authentication.`);
            // Update password if user exists
            await auth.updateUser(userRecord.uid, { password });
            console.log(`✅ Updated password for existing user.`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Create new user
                userRecord = await auth.createUser({
                    email: email,
                    password: password,
                    displayName: name,
                    emailVerified: true
                });
                console.log(`✅ Created user in Authentication: ${email}`);
            } else {
                throw error;
            }
        }

        const uid = userRecord.uid;

        // 2. Set Custom Claims (role: system_admin)
        // Always good practice, although frontend might rely on Firestore role
        await auth.setCustomUserClaims(uid, { role: 'system_admin' });
        console.log('✅ Set custom claims: role=system_admin');

        // 3. Hash Password for Firestore (Required for backend duplicate check)
        const passwordHash = await bcrypt.hash(password, 10);

        // 4. Create/Update User Document in Firestore (Root users collection)
        const userDoc = {
            uid: uid,
            email: email,
            name: name,
            role: 'system_admin',
            isSystemUser: true,
            department: 'System',
            position: 'System Administrator',
            photoURL: null,
            passwordHash: passwordHash, // Store the hash!
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            lastLogin: null
        };

        // Use set with merge to avoiding overwriting extensive existing data if any (though unlikely for sys admin)
        await db.collection('users').doc(uid).set(userDoc, { merge: true });
        console.log(`✅ Created/Updated Firestore document for user: ${uid}`);

        console.log('\n🎉 SYSTEM ADMIN CREATED SUCCESSFULLY!');
        console.log(`   Email:    ${email}`);
        console.log(`   Password: ${password}`);
        console.log('\n   Login at: /system-admin/login');

        process.exit(0);

    } catch (error) {
        console.error('❌ Failed to create system admin:', error);
        process.exit(1);
    }
}

createSystemAdmin();
