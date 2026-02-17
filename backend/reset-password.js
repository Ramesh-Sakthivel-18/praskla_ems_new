const admin = require('./firebase-admin');
const db = admin().firestore();
const bcrypt = require('bcryptjs');

async function resetPassword(email, newPassword) {
    try {
        console.log(`Resetting password for: ${email}`);
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        // Check system users
        const systemQuery = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!systemQuery.empty) {
            const doc = systemQuery.docs[0];
            await doc.ref.update({ passwordHash: hash });
            console.log(`✅ Updated system user password. New password: ${newPassword}`);
            return;
        }

        // Check organizations
        const orgs = await db.collection('organizations').get();
        for (const org of orgs.docs) {
            const userQuery = await org.ref.collection('users').where('email', '==', email).limit(1).get();
            if (!userQuery.empty) {
                const doc = userQuery.docs[0];
                await doc.ref.update({ passwordHash: hash });
                console.log(`✅ Updated org user password in ${org.data().name}. New password: ${newPassword}`);
                return;
            }
        }
        console.log('❌ User not found.');
    } catch (e) {
        console.error(e);
    }
}

resetPassword('logithkumar188@gmail.com', 'password123');
