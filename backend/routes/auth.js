/**
 * auth.js (UPDATED for local JWT Auth with MongoDB)
 * 
 * Routes for authentication (login, register, etc.).
 * Uses EmployeeService and OrganizationRepository from container.
 */

const express = require('express');
const router = express.Router();
const container = require('../container');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ems-super-secret-jwt-key';

// Get service instances from container
const employeeService = container.getEmployeeService();
const orgRepo = container.getOrganizationRepo();
const userRepo = container.getUserRepo();

/**
 * POST /api/auth/login
 * Universal login endpoint for all roles
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, organizationId } = req.body;

    console.log('🔐 Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials', message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;
    let userOrgId = null;

    const db = container.getDatabase();

    // 1. Check target organization if provided
    if (organizationId) {
      const orgUser = await userRepo.findByEmail(organizationId, normalizedEmail);
      if (orgUser) {
        user = orgUser;
        userOrgId = organizationId;
      }
    }

    // 2. Check root system users
    if (!user) {
      const systemUserQuery = await db.collection('users')
        .where('email', '==', normalizedEmail)
        .where('isSystemUser', '==', true)
        .limit(1)
        .get();

      if (!systemUserQuery.empty) {
        const doc = systemUserQuery.docs[0];
        user = { id: doc.id, ...doc.data() };
        userOrgId = null;
      }
    }

    // 3. Search active organizations
    if (!user) {
      if (organizationId) {
        user = await userRepo.findByEmail(organizationId, normalizedEmail);
        if (user) userOrgId = organizationId;
      } else {
        const allOrgs = await orgRepo.findAllActive();
        for (const org of allOrgs) {
          const foundUser = await userRepo.findByEmail(org.id, normalizedEmail);
          if (foundUser) {
            user = foundUser;
            userOrgId = org.id;
            break;
          }
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', message: 'Email or password is incorrect' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account inactive', message: 'Your account has been deactivated.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials', message: 'Email or password is incorrect' });
    }

    // Generate fully local JWT
    const token = jwt.sign({
      uid: user.id,
      sub: user.id,
      organizationId: userOrgId,
      role: user.role,
      email: user.email
    }, JWT_SECRET, { expiresIn: '7d' });

    console.log('✅ Login successful for:', user.name, '(' + user.role + ')');

    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      user: { ...userWithoutPassword, organizationId: userOrgId },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed', message: 'An error occurred during login. Please try again.' });
  }
});

/**
 * POST /api/auth/google
 * Disabled as per pure local JWT auth requirement
 */
router.post('/google', async (req, res) => {
  return res.status(400).json({ error: 'Google Login is disabled (Local Auth Only)' });
});

/**
 * POST /api/auth/register/organization
 */
router.post('/register/organization', async (req, res) => {
  try {
    const { organizationName, ownerName, ownerEmail, ownerPassword, phone } = req.body;

    if (!organizationName || !ownerName || !ownerEmail || !ownerPassword) {
      return res.status(400).json({ error: 'Missing req fields' });
    }

    const existingOrg = await orgRepo.findByOwnerEmail(ownerEmail);
    if (existingOrg) {
      return res.status(409).json({ error: 'Organization already exists' });
    }

    const organization = await orgRepo.create({
      name: organizationName,
      ownerEmail: ownerEmail.toLowerCase(),
      ownerName,
      phone: phone || '',
      maxBusinessOwners: 5,
      maxAdmins: 20,
      maxEmployees: 1000,
      employeesPerAdmin: 50
    });

    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    const businessOwner = await userRepo.create(organization.id, {
      name: ownerName,
      email: ownerEmail.toLowerCase(),
      passwordHash,
      role: 'business_owner',
      department: 'Management',
      position: 'Business Owner',
      createdBy: null
    });

    await orgRepo.incrementUserCount(organization.id, 'business_owner');

    const token = jwt.sign({
      uid: businessOwner.id,
      sub: businessOwner.id,
      organizationId: organization.id,
      role: 'business_owner',
      email: businessOwner.email
    }, JWT_SECRET, { expiresIn: '7d' });

    const { passwordHash: _, ...businessOwnerWithoutPassword } = businessOwner;

    res.status(201).json({
      success: true,
      message: 'Organization registered successfully',
      organization: { id: organization.id, name: organization.name, isActive: organization.isActive },
      user: { ...businessOwnerWithoutPassword, organizationId: organization.id },
      token
    });

  } catch (error) {
    console.error('❌ Organization registration error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Missing or invalid passwords' });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.uid || decoded.sub;
    const userOrgId = decoded.organizationId;

    if (!userOrgId) return res.status(400).json({ error: 'Organization not found' });

    await employeeService.changePassword(userOrgId, userId, oldPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Failed to change password', message: error.message });
  }
});

/**
 * PUT /api/auth/profile
 */
router.put('/profile', async (req, res) => {
  try {
    const { name, phone, department, position, address } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch(e) { return res.status(401).json({ error: 'Invalid token' }); }

    const userId = decoded.uid || decoded.sub;
    const userOrgId = decoded.organizationId;
    const userRole = decoded.role;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (department) updateData.department = department;
    if (position) updateData.position = position;

    let updatedUser;
    if (!userOrgId || userRole === 'system_admin') {
      const db = container.getDatabase();
      await db.collection('users').doc(userId).update(updateData);
      const userDoc = await db.collection('users').doc(userId).get();
      updatedUser = { id: userDoc.id, ...userDoc.data() };
    } else {
      updatedUser = await userRepo.update(userOrgId, userId, updateData);
    }

    const { passwordHash, ...userWithoutPassword } = updatedUser;
    res.json({ success: true, employee: userWithoutPassword });

  } catch (error) {
    res.status(500).json({ error: 'Failed to update user info', message: error.message });
  }
});

/**
 * GET /api/auth/profile
 */
router.get('/profile', async (req, res) => {
  // Aliases /me
  res.redirect(307, '/api/auth/me'); // Temporary redirect to /me
});

/**
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch(e) { return res.status(401).json({ error: 'Invalid token' }); }

    const userId = decoded.uid || decoded.sub;
    const userOrgId = decoded.organizationId;
    const userRole = decoded.role;

    let user = null;

    if (!userOrgId || userRole === 'system_admin') {
      const db = container.getDatabase();
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) user = { id: userDoc.id, ...userDoc.data() };
    } else {
      user = await userRepo.findById(userOrgId, userId);
      if (user && user.managerId) {
        const manager = await userRepo.findById(userOrgId, user.managerId);
        if (manager) user.managerEmail = manager.email;
      }
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ success: true, user: { ...userWithoutPassword, organizationId: userOrgId || null } });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info', message: error.message });
  }
});

module.exports = router;
