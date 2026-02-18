const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const sa = require(path.join(__dirname, 'serviceAccountKey.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const out = [];
function log(msg) { out.push(msg); console.log(msg); }

(async () => {
    try {
        log('=== ALL org docs in organizations collection ===');
        const allOrgs = await db.collection('organizations').get();
        log('Organization documents count: ' + allOrgs.size);
        for (const d of allOrgs.docs) {
            const o = d.data();
            log('  DocID: ' + d.id + ' | name: ' + (o.name || 'N/A') + ' | active: ' + o.isActive + ' | ownerEmail: ' + (o.ownerEmail || 'N/A'));
        }

        // Check if org_demo_001 doc exists specifically
        log('');
        log('=== Checking org_demo_001 doc specifically ===');
        const demo = await db.collection('organizations').doc('org_demo_001').get();
        log('org_demo_001 exists: ' + demo.exists);
        if (demo.exists) log('  Data: ' + JSON.stringify(demo.data()));

        log('');
        log('=== Checking org_test_002 doc specifically ===');
        const test = await db.collection('organizations').doc('org_test_002').get();
        log('org_test_002 exists: ' + test.exists);
        if (test.exists) log('  Data: ' + JSON.stringify(test.data()));

    } catch (e) {
        log('ERROR: ' + e.message);
    }

    fs.writeFileSync(path.join(__dirname, 'check-orgs-results.txt'), out.join('\n'), 'utf8');
    process.exit(0);
})();
