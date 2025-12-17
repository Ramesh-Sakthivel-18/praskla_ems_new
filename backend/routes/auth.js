const express = require('express');
const router = express.Router();
const EmployeeService = require('../services/EmployeeService');
const initFirebaseAdmin = require('../firebase-admin');

// Register employee (admin only or self-registration)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department, position } = req.body;

    // Check if employee already exists
    const existingEmployee = await EmployeeService.findByEmail(email);
    if (existingEmployee) {
      return res.status(400).json({ error: 'Employee already exists with this email' });
    }

    // Create new employee
    const employee = await EmployeeService.create({
      name,
      email,
      password,
      role: role || 'employee',
      department,
      position
    });

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        position: employee.position
      }
    });
  } catch (error) {
    console.error('Error registering employee:', error);
    res.status(500).json({ error: 'Failed to register employee' });
  }
});

// Login with email and password (traditional login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt for email:', email);
    console.log('🔐 Password received:', password ? '[PROVIDED]' : '[MISSING]');

    const employee = await EmployeeService.findByEmail(email);
    console.log('👤 Employee found:', !!employee);
    if (employee) {
      console.log('👤 Employee details:', {
        id: employee.id,
        email: employee.email,
        role: employee.role,
        passwordMatch: employee.password === password
      });
    }
    
    if (!employee) {
      console.log('❌ Login failed: Employee not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // In a real app, you'd hash and compare the password
    // For now, we'll just check if it matches (not secure!)
    console.log('🔑 Password comparison:', {
      provided: password,
      stored: employee.password,
      match: employee.password === password
    });
    
    if (employee.password !== password) {
      console.log('❌ Login failed: Password mismatch');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Password verified, generating custom token...');
    // Generate custom token for Firebase
    const admin = initFirebaseAdmin();
    const customToken = await admin.auth().createCustomToken(employee.id);
    console.log('🎟️ Custom token generated successfully');

    const responseData = {
      success: true,
      message: 'Login successful',
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        position: employee.position
      },
      customToken
    };
    
    console.log('✅ Login successful, sending response');
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const admin = initFirebaseAdmin();

    const decoded = await admin.auth().verifyIdToken(idToken);
    const employee = await EmployeeService.findByUidOrEmail(decoded.uid, decoded.email);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      position: employee.position
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update employee profile
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const admin = initFirebaseAdmin();

    const decoded = await admin.auth().verifyIdToken(idToken);
    const employee = await EmployeeService.findByUidOrEmail(decoded.uid, decoded.email);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Update allowed fields
    const { name, department, position } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (department) updateData.department = department;
    if (position) updateData.position = position;

    const updatedEmployee = await EmployeeService.update(employee.id, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      employee: {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        role: updatedEmployee.role,
        department: updatedEmployee.department,
        position: updatedEmployee.position
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
