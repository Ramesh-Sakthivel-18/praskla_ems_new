const express = require('express');
const router = express.Router();
const AttendanceService = require('../services/AttendanceService');
const { authenticateToken } = require('../middleware');

// Get employee's attendance records
router.get('/my-records', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.employee.id;
    const records = await AttendanceService.getEmployeeRecords(employeeId);
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Get weekly hours summary for the logged-in employee
router.get('/weekly-hours', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.employee.id;
    const result = await AttendanceService.getWeeklyHours(employeeId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching weekly hours:', error);
    res.status(500).json({ error: 'Failed to fetch weekly hours' });
  }
});

// Record attendance action (check-in, check-out, break-in, break-out)
router.post('/record', authenticateToken, async (req, res) => {
  console.log('📋 AttendanceRoutes: POST /record - Recording attendance action');
  try {
    const { action, employeeId: overrideEmployeeId } = req.body; // action: 'checkIn', 'checkOut', 'breakIn', 'breakOut'
    let employeeId = req.user.employee.id;
    let employeeName = req.user.employee.name;
    // Allow admin to record actions for a specific employee
    if (overrideEmployeeId && req.user.employee.role === 'admin') {
      const EmployeeService = require('../services/EmployeeService');
      const target = await EmployeeService.findById(overrideEmployeeId);
      if (!target) {
        return res.status(404).json({ error: 'Target employee not found' });
      }
      employeeId = target.id;
      employeeName = target.name;
    }
    const now = new Date();
    const date = now.toLocaleDateString('en-US');

    console.log(`👤 AttendanceRoutes: Employee: ${employeeName} (${employeeId})`);
    console.log(`🎯 AttendanceRoutes: Action: ${action}, Date: ${date}`);

    // Validate action
    const validActions = ['checkIn', 'checkOut', 'breakIn', 'breakOut'];
    if (!validActions.includes(action)) {
      console.log('❌ AttendanceRoutes: Invalid action provided:', action);
      return res.status(400).json({ error: 'Invalid action' });
    }

    const attendance = await AttendanceService.recordAttendance(employeeId, employeeName, action, date);
    console.log('✅ AttendanceRoutes: Attendance recorded successfully');
    res.json({ success: true, attendance });
  } catch (error) {
    console.error('❌ AttendanceRoutes: Error recording attendance:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Get today's attendance status for employee
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.employee.id;
    const status = await AttendanceService.getTodayStatus(employeeId);
    res.json(status);
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance status' });
  }
});

module.exports = router;
