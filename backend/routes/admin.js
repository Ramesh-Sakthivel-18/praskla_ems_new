const express = require('express');
const router = express.Router();
const AttendanceService = require('../services/AttendanceService');
const EmployeeService = require('../services/EmployeeService');
const { authenticateToken, requireAdmin } = require('../middleware');

// Get all attendance records (admin only)
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  console.log('🔍 AdminRoutes: GET /all - Fetching all attendance records');
  try {
    const { date, employeeName } = req.query;
    const filters = {};

    if (date) filters.date = date;
    if (employeeName) filters.employeeName = employeeName;

    console.log('🔍 AdminRoutes: Using filters:', filters);
    const records = await AttendanceService.getAllRecords(filters);
    console.log(`✅ AdminRoutes: Found ${records.length} attendance records`);
    res.json(records);
  } catch (error) {
    console.error('❌ AdminRoutes: Error fetching all attendance records:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Get attendance records by date range (admin only)
router.get('/date-range', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const records = await AttendanceService.getRecordsByDateRange(startDate, endDate);
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance records by date range:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Get attendance summary (admin only)
router.get('/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const summary = await AttendanceService.getSummary(date);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

// Get employee attendance statistics (admin only)
router.get('/employee/:employeeId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await AttendanceService.getEmployeeStats(employeeId, startDate, endDate);
    res.json(result);
  } catch (error) {
    console.error('Error fetching employee attendance statistics:', error);
    res.status(500).json({ error: 'Failed to fetch employee attendance statistics' });
  }
});

// ===== EMPLOYEE MANAGEMENT ENDPOINTS =====

// Get all employees (admin only)
router.get('/employees', authenticateToken, requireAdmin, async (req, res) => {
  console.log('🔍 GET /api/admin/employees - Fetching all employees');
  try {
    const employees = await EmployeeService.getAll();
    console.log(`✅ Found ${employees.length} employees`);
    res.json(employees);
  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Create new employee (admin only)
router.post('/employees', authenticateToken, requireAdmin, async (req, res) => {
  console.log('📝 POST /api/admin/employees - Creating new employee');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
  console.log('👤 Request user:', req.user ? req.user.employee.email : 'No user');
  
  try {
    const { name, email, password, role, department, position, salary, workingType, skills, address, emergencyContact } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role || !department || !workingType) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['name', 'email', 'password', 'role', 'department', 'workingType'],
        received: { name: !!name, email: !!email, password: !!password, role: !!role, department: !!department, workingType: !!workingType }
      });
    }

    // Check if employee already exists
    console.log('🔍 Checking if employee exists with email:', email);
    const existingEmployee = await EmployeeService.findByEmail(email);
    if (existingEmployee) {
      console.log('⚠️ Employee already exists');
      return res.status(400).json({ error: 'Employee already exists with this email' });
    }

    // Create new employee
    console.log('💾 Creating employee in Firebase...');
    const employeeData = {
      name,
      email,
      password,
      role: role || 'employee',
      department,
      position: position || role,
      salary: salary || '0',
      workingType,
      skills: skills || '',
      address: address || '',
      emergencyContact: emergencyContact || ''
    };
    
    console.log('📝 Employee data to create:', JSON.stringify(employeeData, null, 2));
    const employee = await EmployeeService.create(employeeData);

    console.log('✅ Employee created successfully:', employee.id);
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee
    });
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create employee',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update employee (admin only)
router.put('/employees/:employeeId', authenticateToken, requireAdmin, async (req, res) => {
  console.log('✏️ PUT /api/admin/employees/:id - Updating employee');
  console.log('Employee ID:', req.params.employeeId);
  console.log('Update data:', req.body);
  try {
    const { employeeId } = req.params;
    const updateData = req.body;

    const updatedEmployee = await EmployeeService.update(employeeId, updateData);

    if (!updatedEmployee) {
      console.log('⚠️ Employee not found for update');
      return res.status(404).json({ error: 'Employee not found' });
    }

    console.log('✅ Employee updated successfully');
    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('❌ Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Delete employee (admin only)
router.delete('/employees/:employeeId', authenticateToken, requireAdmin, async (req, res) => {
  console.log('🗑️ DELETE /api/admin/employees/:id - Deleting employee');
  console.log('Employee ID:', req.params.employeeId);
  try {
    const { employeeId } = req.params;

    // Check if employee exists
    const employee = await EmployeeService.findById(employeeId);
    if (!employee) {
      console.log('⚠️ Employee not found for deletion');
      return res.status(404).json({ error: 'Employee not found' });
    }

    // In Firebase, we'll mark as inactive instead of deleting
    await EmployeeService.update(employeeId, { isActive: false });
    console.log('✅ Employee marked as inactive');

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

module.exports = router;
