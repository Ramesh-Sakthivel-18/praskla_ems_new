
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const bcrypt = require('bcryptjs');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function createTestEmployee() {
    console.log('Creating test employee...');

    // Get first organization
    const orgsSnapshot = await db.collection('organizations').limit(1).get();
    if (orgsSnapshot.empty) {
        console.error('No organizations found!');
        return;
    }

    const orgDoc = orgsSnapshot.docs[0];
    const orgId = orgDoc.id;
    const orgName = orgDoc.data().name;
    console.log(`Using Organization: ${orgName} (${orgId})`);

    const email = 'emp2@gmail.com';
    const password = 'password123';
    const name = 'Test Employee 2';

    try {
        // 1. Create in Firebase Auth
        let uid;
        try {
            const userRecord = await auth.getUserByEmail(email);
            uid = userRecord.uid;
            console.log('User already exists in Auth, updating password...');
            await auth.updateUser(uid, { password });
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log('Creating new Auth user...');
                const userRecord = await auth.createUser({
                    email,
                    password,
                    displayName: name
                });
                uid = userRecord.uid;
            } else {
                throw e;
            }
        }

        // 2. Hash Password for Backend Verification
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Create/Update in Firestore (under organization)
        await db.collection('organizations').doc(orgId).collection('users').doc(uid).set({
            name,
            email,
            role: 'employee',
            organizationId: orgId,
            organizationName: orgName,
            isActive: true,
            passwordHash, // Critical for backend login
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }); // Merge to avoid overwriting other fields if they exist

        console.log(`\n✅ Successfully created/updated user:`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Organization: ${orgName}`);

    } catch (error) {
        console.error('Error creating user:', error);
    }
}

createTestEmployee();
