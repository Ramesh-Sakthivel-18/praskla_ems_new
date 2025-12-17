const express = require('express');
const router = express.Router();
const LeaveService = require('../services/LeaveService');
const EmployeeService = require('../services/EmployeeService');
const initFirebaseAdmin = require('../firebase-admin');

// Middleware to verify auth token and get employee
const authenticateToken = async (req, res, next) => {
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

    req.employee = employee;
    req.decoded = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.employee.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// POST /api/leave/apply - Submit leave request (employee only)
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, startDate, endDate, reason, employeeId: targetEmployeeId } = req.body;
    const sDate = startDate || fromDate;
    const eDate = endDate || toDate;
    if (!leaveType || !sDate || !eDate || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let empId = req.employee.id;
    let empName = req.employee.name;
    if (targetEmployeeId && req.employee.role === 'admin') {
      const target = await EmployeeService.findById(targetEmployeeId);
      if (!target) {
        return res.status(404).json({ error: 'Target employee not found' });
      }
      empId = target.id;
      empName = target.name;
    }

    const leaveData = {
      employeeId: empId,
      employeeName: empName,
      leaveType,
      startDate: sDate,
      endDate: eDate,
      reason
    };

    const leaveRequest = await LeaveService.create(leaveData);
    res.status(201).json({ success: true, leaveRequest });
  } catch (error) {
    console.error('Error applying for leave:', error);
    res.status(500).json({ error: 'Failed to apply for leave' });
  }
});

// GET /api/leave/my-requests - Get employee's leave requests
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const requests = await LeaveService.getByEmployee(req.employee.id);
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching my leave requests:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// GET /api/leave/all - Get all leave requests (admin only)
router.get('/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const requests = await LeaveService.getAll();
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching all leave requests:', error);
    res.status(500).json({ error: 'Failed to fetch all leave requests' });
  }
});

// PUT /api/leave/:id/status - Update leave request status (admin only)
router.put('/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Approved' or 'Rejected'
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedRequest = await LeaveService.updateStatus(id, status);
    res.json({ success: true, leaveRequest: updatedRequest });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ error: 'Failed to update leave status' });
  }
});

module.exports = router;
