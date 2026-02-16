
const admin = require('firebase-admin');
const serviceAccount = require('./backend/serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function recalculateCounts() {
    console.log('🔄 Starting count recalculation...');

    const orgsSnapshot = await db.collection('organizations').get();

    if (orgsSnapshot.empty) {
        console.log('❌ No organizations found.');
        return;
    }

    for (const orgDoc of orgsSnapshot.docs) {
        const orgId = orgDoc.id;
        const orgName = orgDoc.data().name;
        const currentCounts = orgDoc.data().counts || {};

        console.log(`\n🏢 Organization: ${orgName} (${orgId})`);
        console.log(`   Current DB Counts:`, JSON.stringify(currentCounts));

        // Get all users
        const usersSnapshot = await orgDoc.ref.collection('users').get();

        const realCounts = {
            businessOwners: 0,
            admins: 0,
            employees: 0
        };

        usersSnapshot.forEach(doc => {
            const role = doc.data().role;
            if (role === 'business_owner') realCounts.businessOwners++;
            else if (role === 'admin') realCounts.admins++;
            else if (role === 'employee') realCounts.employees++;
            else console.log(`   ⚠️ Unknown role: ${role} for user ${doc.id}`);
        });

        console.log(`   Real Counts:      `, JSON.stringify(realCounts));

        // Update if different
        if (
            realCounts.businessOwners !== currentCounts.businessOwners ||
            realCounts.admins !== currentCounts.admins ||
            realCounts.employees !== currentCounts.employees
        ) {
            console.log('   ⚠️ Mismatch detected! Updating...');
            await orgDoc.ref.update({
                counts: {
                    ...currentCounts, // preserve other fields if any
                    businessOwners: realCounts.businessOwners,
                    admins: realCounts.admins,
                    employees: realCounts.employees
                }
            });
            console.log('   ✅ Counts updated successfully.');
        } else {
            console.log('   ✅ Counts are correct.');
        }
    }

    console.log('\n✅ Recalculation complete.');
}

recalculateCounts().catch(console.error);
