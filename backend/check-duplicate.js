const admin = require('./firebase-admin');
const db = admin().firestore();

async function checkDuplicateUser(email) {
    try {
        console.log(`Checking for duplicates for: ${email}`);

        // Check system users
        const systemQuery = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!systemQuery.empty) {
            const u = systemQuery.docs[0].data();
            console.log('✅ Found SYSTEM user:');
            console.log(`   ID: ${systemQuery.docs[0].id}`);
            console.log(`   Role: ${u.role}`);
        } else {
            console.log('❌ No SYSTEM user found.');
        }

        // Check organizations
        const orgs = await db.collection('organizations').get();
        let foundOrgUser = false;
        for (const org of orgs.docs) {
            const userQuery = await org.ref.collection('users').where('email', '==', email).limit(1).get();
            if (!userQuery.empty) {
                foundOrgUser = true;
                const u = userQuery.docs[0].data();
                console.log(`✅ Found ORG user in "${org.data().name}" (${org.id}):`);
                console.log(`   ID: ${userQuery.docs[0].id}`);
                console.log(`   Role: ${u.role}`);
            }
        }
        if (!foundOrgUser) {
            console.log('❌ No ORG user found.');
        }

    } catch (e) {
        console.error(e);
    }
}

checkDuplicateUser('logithkumar188@gmail.com');
