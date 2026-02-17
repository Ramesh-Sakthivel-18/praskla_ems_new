const admin = require('./firebase-admin');
const db = admin().firestore();

async function checkUser(email) {
    try {
        console.log(`Checking user: ${email}`);

        // Check system users
        const systemQuery = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!systemQuery.empty) {
            const u = systemQuery.docs[0].data();
            console.log('Found in system users:');
            console.log('ID:', systemQuery.docs[0].id);
            console.log('Role:', u.role);
            console.log('Password Hash:', u.passwordHash);
            return;
        }

        // Check organizations
        const orgs = await db.collection('organizations').get();
        for (const org of orgs.docs) {
            const userQuery = await org.ref.collection('users').where('email', '==', email).limit(1).get();
            if (!userQuery.empty) {
                const u = userQuery.docs[0].data();
                console.log(`Found in organization: ${org.data().name} (${org.id})`);
                console.log('ID:', userQuery.docs[0].id);
                console.log('Role:', u.role);
                console.log('Password Hash:', u.passwordHash);
                return;
            }
        }
        console.log('User not found anywhere.');
    } catch (e) {
        console.error(e);
    }
}

checkUser('logithkumar188@gmail.com');
