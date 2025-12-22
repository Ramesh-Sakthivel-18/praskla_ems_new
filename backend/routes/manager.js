const express = require('express');
const router = express.Router();
const initFirebaseAdmin = require('../firebase-admin');

// ⚠️ DEMO-ONLY: simple check, no verifyIdToken
const isManager = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split('Bearer ')[1]
    : '';

  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  // For demo, assume any valid token from admin login for this email is manager
  // You can add a tiny check on currentEmployee header later if needed
  req.user = {
    id: 'hardcoded_manager_id',
    email: 'praskla@gmail.com',
    role: 'manager',
  };

  return next();
};

// keep the existing routes using isManager
router.get('/dashboard', isManager, async (req, res) => {
  try {
    const admin = initFirebaseAdmin();
    const db = admin.firestore();

    const orgsSnapshot = await db.collection('organizations').get();
    const organizations = [];

    for (const doc of orgsSnapshot.docs) {
      const orgData = doc.data();
      const orgId = doc.id;

      const adminsSnapshot = await db
        .collection('employees')
        .where('organizationId', '==', orgId)
        .where('role', '==', 'admin')
        .get();

      const employeesSnapshot = await db
        .collection('employees')
        .where('organizationId', '==', orgId)
        .where('role', '==', 'employee')
        .get();

      organizations.push({
        id: orgId,
        name: orgData.name,
        ownerEmail: orgData.ownerEmail,
        phone: orgData.phone || '',
        isActive: orgData.isActive,
        createdAt: orgData.createdAt,
        adminCount: adminsSnapshot.size,
        employeeCount: employeesSnapshot.size,
      });
    }

    res.json({ success: true, organizations });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.put('/toggle-status/:id', isManager, async (req, res) => {
  try {
    const admin = initFirebaseAdmin();
    const db = admin.firestore();

    const orgRef = db.collection('organizations').doc(req.params.id);
    const doc = await orgRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const currentStatus = doc.data().isActive;
    const newStatus = !currentStatus;

    await orgRef.update({ isActive: newStatus });

    res.json({
      success: true,
      message: `Organization ${newStatus ? 'activated' : 'deactivated'} successfully`,
      isActive: newStatus,
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    res.status(500).json({ error: 'Failed to toggle organization status' });
  }
});

module.exports = router;
