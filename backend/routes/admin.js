/**
 * admin.js (UPDATED)
 * 
 * Routes for admin operations (employee management, attendance, leaves).
 * Uses EmployeeService, QuotaService, AttendanceService, LeaveService from container.
 */

const express = require('express');
const router = express.Router();
const container = require('../container');
const { authenticateToken, requireAdmin, requireAdminOrBusinessOwner } = require('../middleware');

// Get service instances from container
const employeeService = container.getEmployeeService();
const quotaService = container.getQuotaService();
const attendanceService = container.getAttendanceService();
const leaveService = container.getLeaveService();
const statisticsService = container.getStatisticsService();

/**
 * POST /api/admin/employees
 * Create new employee
 * Admin only
 */
router.post('/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, department, position, salary, workingType, skills, address, emergencyContact, phone } = req.body;
    const orgId = req.user.organizationId;
    const adminId = req.user.uid;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'name, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password too short',
        message: 'Password must be at least 6 characters'
      });
    }

    // Create employee (automatically checks quota)
    const employee = await employeeService.createEmployee(
      orgId,
      {
        name,
        email,
        password,
        department: department || '',
        position: position || 'Employee',
        salary: salary || '0',
        workingType: workingType || 'full-time',
        skills: skills || '',
        address: address || '',
        emergencyContact: emergencyContact || '',
        phone: phone || ''
      },
      adminId,
      'admin'
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    
    // Handle specific errors
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(403).json({
        error: 'Quota exceeded',
        message: error.message
      });
    }
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Employee already exists',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to create employee',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/employees
 * Get all employees in organization
 * Admin or Business Owner
 */
router.get('/employees', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { isActive } = req.query;

    const filters = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    const employees = await employeeService.getAllEmployees(orgId, filters);

    res.json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('Error getting employees:', error);
    res.status(500).json({
      error: 'Failed to get employees',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/employees/active
 * Get only active employees
 * Admin or Business Owner
 */
router.get('/employees/active', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const employees = await employeeService.getActiveEmployees(orgId);

    res.json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('Error getting active employees:', error);
    res.status(500).json({
      error: 'Failed to get active employees',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/employees/:employeeId
 * Get specific employee by ID
 * Admin or Business Owner
 */
router.get('/employees/:employeeId', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const orgId = req.user.organizationId;

    const employee = await employeeService.getEmployeeById(orgId, employeeId);

    if (!employee) {
      return res.status(404).json({
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Error getting employee:', error);
    res.status(500).json({
      error: 'Failed to get employee',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/employees/:employeeId
 * Update employee information
 * Admin only
 */
router.put('/employees/:employeeId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const orgId = req.user.organizationId;
    const updateData = req.body;

    // Don't allow updating certain fields through this endpoint
    delete updateData.role;
    delete updateData.createdBy;
    delete updateData.organizationId;
    delete updateData.id;

    const updated = await employeeService.updateEmployee(orgId, employeeId, updateData);

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Employee not found'
      });
    }

    if (error.message.includes('already in use')) {
      return res.status(409).json({
        error: 'Email already in use',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to update employee',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/employees/:employeeId
 * Delete employee (soft delete - mark as inactive)
 * Admin only
 */
router.delete('/employees/:employeeId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const orgId = req.user.organizationId;
    const adminId = req.user.uid;

    const result = await employeeService.deleteEmployee(orgId, employeeId, adminId);

    res.json({
      success: true,
      message: 'Employee deactivated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Employee not found'
      });
    }

    res.status(500).json({
      error: 'Failed to delete employee',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/employees/:employeeId/restore
 * Restore soft-deleted employee
 * Admin only
 */
router.post('/employees/:employeeId/restore', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const orgId = req.user.organizationId;

    const restored = await employeeService.restoreEmployee(orgId, employeeId);

    res.json({
      success: true,
      message: 'Employee restored successfully',
      data: restored
    });
  } catch (error) {
    console.error('Error restoring employee:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Employee not found'
      });
    }

    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(403).json({
        error: 'Cannot restore',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to restore employee',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/employees/search/:searchTerm
 * Search employees by name, email, or department
 * Admin or Business Owner
 */
router.get('/employees/search/:searchTerm', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const { searchTerm } = req.params;
    const orgId = req.user.organizationId;

    if (!searchTerm || searchTerm.length < 2) {
      return res.status(400).json({
        error: 'Invalid search term',
        message: 'Search term must be at least 2 characters'
      });
    }

    const results = await employeeService.searchEmployees(orgId, searchTerm);

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error searching employees:', error);
    res.status(500).json({
      error: 'Failed to search employees',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/employees/department/:department
 * Get employees by department
 * Admin or Business Owner
 */
router.get('/employees/department/:department', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const { department } = req.params;
    const orgId = req.user.organizationId;

    const employees = await employeeService.getEmployeesByDepartment(orgId, department);

    res.json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('Error getting employees by department:', error);
    res.status(500).json({
      error: 'Failed to get employees',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/employees/stats/count
 * Get employee counts
 * Admin or Business Owner
 */
router.get('/employees/stats/count', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const counts = await employeeService.getEmployeeCount(orgId);

    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    console.error('Error getting employee count:', error);
    res.status(500).json({
      error: 'Failed to get employee count',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/employees/stats/overview
 * Get employee statistics overview
 * Admin or Business Owner
 */
router.get('/employees/stats/overview', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const stats = await employeeService.getEmployeeStats(orgId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting employee stats:', error);
    res.status(500).json({
      error: 'Failed to get employee statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/employees/created-by-me
 * Get employees created by current admin
 * Admin only
 */
router.get('/employees/created-by-me', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const adminId = req.user.uid;

    const employees = await employeeService.getEmployeesCreatedByAdmin(orgId, adminId);

    res.json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('Error getting admin employees:', error);
    res.status(500).json({
      error: 'Failed to get employees',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/quota
 * Get admin's quota information
 * Admin only
 */
router.get('/quota', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const adminId = req.user.uid;

    const quotaInfo = await quotaService.getMyQuotaInfo(orgId, adminId, 'admin');

    res.json({
      success: true,
      data: quotaInfo
    });
  } catch (error) {
    console.error('Error getting quota info:', error);
    res.status(500).json({
      error: 'Failed to get quota information',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/quota/check
 * Check if admin can create more employees
 * Admin only
 */
router.get('/quota/check', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const adminId = req.user.uid;

    const check = await quotaService.canAdminCreateEmployee(orgId, adminId);

    res.json({
      success: true,
      data: check
    });
  } catch (error) {
    console.error('Error checking quota:', error);
    res.status(500).json({
      error: 'Failed to check quota',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/leaves
 * Get all leave requests (or filter by status)
 * Admin or Business Owner
 */
router.get('/leaves', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { status, userId, startDate, endDate, limit } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = parseInt(limit);

    const leaves = await leaveService.getAllLeaves(orgId, filters);

    res.json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    console.error('Error getting leaves:', error);
    res.status(500).json({
      error: 'Failed to get leave requests',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/leaves/pending
 * Get pending leave requests for approval
 * Admin only
 */
router.get('/leaves/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const pendingLeaves = await leaveService.getPendingLeaves(orgId);

    res.json({
      success: true,
      count: pendingLeaves.length,
      data: pendingLeaves
    });
  } catch (error) {
    console.error('Error getting pending leaves:', error);
    res.status(500).json({
      error: 'Failed to get pending leave requests',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/leaves/:leaveId/approve
 * Approve leave request
 * Admin only
 */
router.post('/leaves/:leaveId/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { comments } = req.body;
    const orgId = req.user.organizationId;
    const adminId = req.user.uid;

    const approved = await leaveService.approveLeave(
      orgId,
      leaveId,
      adminId,
      comments || null
    );

    res.json({
      success: true,
      message: 'Leave request approved',
      data: approved
    });
  } catch (error) {
    console.error('Error approving leave:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Leave request not found'
      });
    }

    res.status(500).json({
      error: 'Failed to approve leave',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/leaves/:leaveId/reject
 * Reject leave request
 * Admin only
 */
router.post('/leaves/:leaveId/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { comments } = req.body;
    const orgId = req.user.organizationId;
    const adminId = req.user.uid;

    if (!comments) {
      return res.status(400).json({
        error: 'Rejection reason required',
        message: 'Please provide a reason for rejection in the comments field'
      });
    }

    const rejected = await leaveService.rejectLeave(
      orgId,
      leaveId,
      adminId,
      comments
    );

    res.json({
      success: true,
      message: 'Leave request rejected',
      data: rejected
    });
  } catch (error) {
    console.error('Error rejecting leave:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Leave request not found'
      });
    }

    res.status(500).json({
      error: 'Failed to reject leave',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/leaves/stats/summary
 * Get leave summary (counts by status)
 * Admin or Business Owner
 */
router.get('/leaves/stats/summary', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const summary = await leaveService.getLeaveSummary(orgId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting leave summary:', error);
    res.status(500).json({
      error: 'Failed to get leave summary',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/leaves/stats/organization
 * Get organization leave statistics
 * Admin or Business Owner
 */
router.get('/leaves/stats/organization', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'startDate and endDate are required (YYYY-MM-DD format)'
      });
    }

    const orgId = req.user.organizationId;
    const stats = await leaveService.getOrgLeaveStats(orgId, startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting org leave stats:', error);
    res.status(500).json({
      error: 'Failed to get organization leave statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics (combined stats for admin dashboard)
 * Admin or Business Owner
 */
router.get('/dashboard/stats', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const today = new Date().toISOString().split('T')[0];

    // Get multiple stats in parallel
    const [
      employeeCounts,
      todayAttendance,
      leaveSummary
    ] = await Promise.all([
      employeeService.getEmployeeCount(orgId),
      statisticsService.getDailyStats(orgId, today),
      leaveService.getLeaveSummary(orgId)
    ]);

    res.json({
      success: true,
      data: {
        employees: employeeCounts,
        attendance: todayAttendance,
        leaves: leaveSummary,
        date: today
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to get dashboard statistics',
      message: error.message
    });
  }
});

module.exports = router;
