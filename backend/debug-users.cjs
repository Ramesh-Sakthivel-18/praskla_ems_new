
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listUsers() {
    console.log('Fetching users...');

    // Check root users collection
    console.log('\nChecking ROOT users collection...');
    const rootUsers = await db.collection('users').get();
    rootUsers.forEach(doc => {
        const u = doc.data();
        if (u.email === 'emp2@gmail.com') {
            const hashPrefix = u.passwordHash ? u.passwordHash.substring(0, 10) : 'NONE';
            console.log(`DUPE: [ROOT] UserID:${doc.id} Hash:${hashPrefix}...`);
        }
    });

    // Get all organizations first to navigate hierarchy
    const orgsSnapshot = await db.collection('organizations').get();
    console.log(`\nFound ${orgsSnapshot.size} total organizations.`);

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
            if (u.email === 'emp2@gmail.com') {
                const hashPrefix = u.passwordHash ? u.passwordHash.substring(0, 10) : 'NONE';
                console.log(`DUPE: [${orgDoc.data().name}] UserID:${doc.id} Hash:${hashPrefix}...`);
            }
        });
    }
}

listUsers().catch(console.error);
