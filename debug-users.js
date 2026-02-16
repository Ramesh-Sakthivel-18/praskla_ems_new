
const admin = require('firebase-admin');
const serviceAccount = require('./backend/serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listUsers() {
    console.log('Fetching users...');

    // Get all organizations first to navigate hierarchy
    const orgsSnapshot = await db.collection('organizations').get();

    for (const orgDoc of orgsSnapshot.docs) {
        console.log(`\nOrganization: ${orgDoc.data().name} (${orgDoc.id})`);
        console.log(`  Counts:`, orgDoc.data().counts);


        const usersSnapshot = await orgDoc.ref.collection('users').get();

        if (usersSnapshot.empty) {
            console.log('  No users found.');
            continue;
        }

        usersSnapshot.forEach(doc => {
            const u = doc.data();
            console.log(`  - ${u.name} (${u.email}) | Role: '${u.role}' | Active: ${u.isActive}`);
        });
    }
}

listUsers().catch(console.error);
