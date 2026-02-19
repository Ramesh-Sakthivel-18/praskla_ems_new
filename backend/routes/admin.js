/**
 * admin.js (UPDATED - RBAC Fixed)
 * 
 * Routes for Admin and Business Owner with proper access control:
 * - Admin: Create/Update/Delete employees, Approve leaves
 * - Business Owner: View-only + Admin management
 * - Both: View employees, attendance, leaves
 */

const express = require('express');
const router = express.Router();
const container = require('../container');
const {
  authenticateToken,
  requireAdmin,
  requireBusinessOwner,
  requireAdminOrBusinessOwner
} = require('../middleware');

// Get services
const employeeService = container.getEmployeeService();
const attendanceService = container.getAttendanceService();
const leaveService = container.getLeaveService();
const quotaService = container.getQuotaService();

// ============================================
// EMPLOYEE MANAGEMENT
// ============================================

/**
 * CREATE Employee (ADMIN ONLY)
 * POST /api/admin/employees
 */
router.post('/employees', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log('📝 POST /api/admin/employees - Create user (Admin/Employee)');
  try {
    const { name, email, password, department, position, salary, workingType, skills, address, emergencyContact, phone, role } = req.body;
    const { organizationId, uid: creatorId, role: creatorRole } = req.user;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Default to 'employee' if role not provided
    const targetRole = role || 'employee';

    // Create user (quota validation and permission check happens in service)
    const employee = await employeeService.createEmployee(
      organizationId,
      { name, email, password, department, position, salary, workingType, skills, address, emergencyContact, phone, role: targetRole },
      creatorId,
      creatorRole
    );

    res.status(201).json({
      message: 'Employee created successfully',
      employee
    });

  } catch (error) {
    console.error('❌ Error creating employee:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET All Employees (ADMIN + BUSINESS OWNER - Read Only)
 * GET /api/admin/employees
 * Returns all organization members (admins + employees) for Business Owner view
 */
router.get('/employees', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log('📋 GET /api/admin/employees - Get all employees');
  try {
    const { organizationId } = req.user;
    const { isActive, role } = req.query;

    console.log('🔍 DEBUG: Admin Employees - User:', {
      uid: req.user.uid,
      role: req.user.role,
      organizationId
    });

    if (!organizationId) {
      console.error('❌ Error: organizationId is missing from req.user');
      return res.status(500).json({ error: 'Organization ID is missing from user session' });
    }

    // Use userRepo.findAll() to get all org members (admins + employees)
    const filters = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    if (role) {
      filters.role = role;
    }

    // Access userRepo from the container
    const userRepo = container.getUserRepo();
    const allUsers = await userRepo.findAll(organizationId, filters);

    // Remove password hashes from response
    const usersWithoutPasswords = allUsers.map(user => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({
      count: usersWithoutPasswords.length,
      employees: usersWithoutPasswords
    });

  } catch (error) {
    console.error('❌ Error getting employees:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Active Employees Only (ADMIN + BUSINESS OWNER)
 * GET /api/admin/employees/active
 */
router.get('/employees/active', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log('📋 GET /api/admin/employees/active');
  try {
    const { organizationId } = req.user;
    const employees = await employeeService.getActiveEmployees(organizationId);

    res.json({
      count: employees.length,
      employees
    });

  } catch (error) {
    console.error('❌ Error getting active employees:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Employees Created by Me (ADMIN ONLY)
 * GET /api/admin/employees/created-by-me
 * NOTE: This MUST be before /employees/:id to prevent route shadowing
 */
router.get('/employees/created-by-me', authenticateToken, requireAdmin, async (req, res) => {
  console.log('📋 GET /api/admin/employees/created-by-me');
  try {
    const { organizationId, uid: adminId } = req.user;

    const employees = await employeeService.getEmployeesCreatedByAdmin(organizationId, adminId);

    res.json({
      count: employees.length,
      employees
    });

  } catch (error) {
    console.error('❌ Error getting admin employees:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Employee by ID (ADMIN + BUSINESS OWNER)
 * GET /api/admin/employees/:id
 */
router.get('/employees/:id', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log(`📋 GET /api/admin/employees/${req.params.id}`);
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const employee = await employeeService.getEmployeeById(organizationId, id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ employee });

  } catch (error) {
    console.error('❌ Error getting employee:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * UPDATE Employee (ADMIN ONLY)
 * PUT /api/admin/employees/:id
 */
router.put('/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
  console.log(`📝 PUT /api/admin/employees/${req.params.id} - Update employee`);
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const employee = await employeeService.updateEmployee(organizationId, id, updateData);

    res.json({
      message: 'Employee updated successfully',
      employee
    });

  } catch (error) {
    console.error('❌ Error updating employee:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE Employee (ADMIN ONLY)
 * DELETE /api/admin/employees/:id
 */
router.delete('/employees/:id', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log(`🗑️ DELETE /api/admin/employees/${req.params.id}`);
  try {
    const { organizationId, uid: deletedBy } = req.user;
    const { id } = req.params;

    const result = await employeeService.deleteEmployee(organizationId, id, deletedBy);

    res.json({
      message: 'Employee deleted successfully',
      employee: result
    });
  } catch (error) {
    console.error('❌ Error deleting employee:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ASSIGN MANAGER (ADMIN ONLY)
 * PUT /api/admin/employees/:id/assign-manager
 */
router.put('/employees/:id/assign-manager', authenticateToken, requireAdmin, async (req, res) => {
  console.log(`👥 PUT /api/admin/employees/${req.params.id}/assign-manager`);
  try {
    const { organizationId, uid: adminId } = req.user;
    const { id } = req.params;
    const { managerId } = req.body; // Can be null to unassign

    const updatedEmployee = await employeeService.assignManager(organizationId, id, managerId, adminId);

    res.json({
      message: 'Manager assigned successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('❌ Error assigning manager:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * RESTORE Employee (ADMIN ONLY)
 * POST /api/admin/employees/:id/restore
 */
router.post('/employees/:id/restore', authenticateToken, requireAdmin, async (req, res) => {
  console.log(`♻️ POST /api/admin/employees/${req.params.id}/restore`);
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const employee = await employeeService.restoreEmployee(organizationId, id);

    res.json({
      message: 'Employee restored successfully',
      employee
    });

  } catch (error) {
    console.error('❌ Error restoring employee:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * SEARCH Employees (ADMIN + BUSINESS OWNER)
 * GET /api/admin/employees/search/:term
 */
router.get('/employees/search/:term', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log(`🔍 GET /api/admin/employees/search/${req.params.term}`);
  try {
    const { organizationId } = req.user;
    const { term } = req.params;

    const employees = await employeeService.searchEmployees(organizationId, term);

    res.json({
      count: employees.length,
      employees
    });

  } catch (error) {
    console.error('❌ Error searching employees:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Employees by Department (ADMIN + BUSINESS OWNER)
 * GET /api/admin/employees/department/:dept
 */
router.get('/employees/department/:dept', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log(`📋 GET /api/admin/employees/department/${req.params.dept}`);
  try {
    const { organizationId } = req.user;
    const { dept } = req.params;

    const employees = await employeeService.getEmployeesByDepartment(organizationId, dept);

    res.json({
      department: dept,
      count: employees.length,
      employees
    });

  } catch (error) {
    console.error('❌ Error getting employees by department:', error);
    res.status(500).json({ error: error.message });
  }
});

// created-by-me route moved above /employees/:id to prevent shadowing

// ============================================
// ATTENDANCE MANAGEMENT (View Only for Both)
// ============================================

/**
 * GET Attendance Records (ADMIN + BUSINESS OWNER - Read Only)
 * GET /api/admin/attendance
 */
router.get('/attendance', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log('📊 GET /api/admin/attendance');
  try {
    const { organizationId } = req.user;
    const { date, userId, startDate, endDate } = req.query;

    const filters = {};
    if (date) filters.date = date;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const records = await attendanceService.getAllRecords(organizationId, filters);

    res.json({
      count: records.length,
      records
    });

  } catch (error) {
    console.error('❌ Error getting attendance records:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Attendance Summary (ADMIN + BUSINESS OWNER - Read Only)
 * GET /api/admin/attendance/summary
 */
router.get('/attendance/summary', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log('📊 GET /api/admin/attendance/summary');
  try {
    const { organizationId } = req.user;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const summary = await attendanceService.getSummary(organizationId, date);

    res.json({ date, summary });

  } catch (error) {
    console.error('❌ Error getting attendance summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LEAVE MANAGEMENT
// ============================================

/**
 * GET All Leave Requests (ADMIN + BUSINESS OWNER - Read Only)
 * GET /api/admin/leaves
 */
router.get('/leaves', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log('📋 GET /api/admin/leaves');
  try {
    const { organizationId } = req.user;
    const { status, userId, startDate, endDate } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const leaves = await leaveService.getAllLeaves(organizationId, filters);

    res.json({
      count: leaves.length,
      leaves
    });

  } catch (error) {
    console.error('❌ Error getting leaves:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Pending Leave Requests (ADMIN + BUSINESS OWNER - Read Only)
 * GET /api/admin/leaves/pending
 */
router.get('/leaves/pending', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log('⏳ GET /api/admin/leaves/pending');
  try {
    const { organizationId } = req.user;

    const pendingLeaves = await leaveService.getPendingLeaves(organizationId);

    res.json({
      count: pendingLeaves.length,
      leaves: pendingLeaves
    });

  } catch (error) {
    console.error('❌ Error getting pending leaves:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * APPROVE Leave Request (ADMIN ONLY)
 * POST /api/admin/leaves/:id/approve
 */
router.post('/leaves/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  console.log(`✅ POST /api/admin/leaves/${req.params.id}/approve`);
  try {
    const { organizationId, uid: reviewerId } = req.user;
    const { id } = req.params;
    const { comments } = req.body;

    const leave = await leaveService.approveLeave(organizationId, id, reviewerId, comments);

    res.json({
      message: 'Leave request approved',
      leave
    });

  } catch (error) {
    console.error('❌ Error approving leave:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * REJECT Leave Request (ADMIN ONLY)
 * POST /api/admin/leaves/:id/reject
 */
router.post('/leaves/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  console.log(`❌ POST /api/admin/leaves/${req.params.id}/reject`);
  try {
    const { organizationId, uid: reviewerId } = req.user;
    const { id } = req.params;
    const { comments } = req.body;

    if (!comments) {
      return res.status(400).json({ error: 'Rejection reason (comments) is required' });
    }

    const leave = await leaveService.rejectLeave(organizationId, id, reviewerId, comments);

    res.json({
      message: 'Leave request rejected',
      leave
    });

  } catch (error) {
    console.error('❌ Error rejecting leave:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Leave Statistics (ADMIN + BUSINESS OWNER)
 * GET /api/admin/leaves/stats/summary
 */
router.get('/leaves/stats/summary', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log('📊 GET /api/admin/leaves/stats/summary');
  try {
    const { organizationId } = req.user;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const stats = await leaveService.getLeaveSummary(organizationId);

    res.json({ year, stats });

  } catch (error) {
    console.error('❌ Error getting leave stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// QUOTA MANAGEMENT
// ============================================

/**
 * GET My Quota (ADMIN ONLY)
 * GET /api/admin/quota
 */
router.get('/quota', authenticateToken, requireAdmin, async (req, res) => {
  console.log('📊 GET /api/admin/quota');
  try {
    const { organizationId, uid: userId, role } = req.user;

    const quotaInfo = await quotaService.getMyQuotaInfo(organizationId, userId, role);

    res.json(quotaInfo);

  } catch (error) {
    console.error('❌ Error getting quota:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * CHECK if Admin Can Create Employee (ADMIN ONLY)
 * GET /api/admin/quota/check
 */
router.get('/quota/check', authenticateToken, requireAdmin, async (req, res) => {
  console.log('🔍 GET /api/admin/quota/check');
  try {
    const { organizationId, uid: adminId } = req.user;

    const canCreate = await quotaService.canAdminCreateEmployee(organizationId, adminId);

    res.json(canCreate);

  } catch (error) {
    console.error('❌ Error checking quota:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Admin Quota Status (BUSINESS OWNER ONLY)
 * GET /api/admin/admins/quota-status
 */
router.get('/admins/quota-status', authenticateToken, requireBusinessOwner, async (req, res) => {
  console.log('📊 GET /api/admin/admins/quota-status');
  try {
    const { organizationId } = req.user;

    const adminsQuota = await quotaService.getAdminQuotaStatus(organizationId);

    res.json({
      count: adminsQuota.length,
      admins: adminsQuota
    });

  } catch (error) {
    console.error('❌ Error getting admin quota status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * UPDATE Admin Quota (BUSINESS OWNER ONLY)
 * PUT /api/admin/admins/:id/quota
 */
router.put('/admins/:id/quota', authenticateToken, requireBusinessOwner, async (req, res) => {
  console.log(`📝 PUT /api/admin/admins/${req.params.id}/quota`);
  try {
    const { organizationId } = req.user;
    const { id: adminId } = req.params;
    const { limit } = req.body;

    if (!limit || limit < 1) {
      return res.status(400).json({ error: 'Valid limit is required (minimum 1)' });
    }

    const admin = await quotaService.updateAdminQuota(organizationId, adminId, limit);

    res.json({
      message: 'Admin quota updated successfully',
      admin
    });

  } catch (error) {
    console.error('❌ Error updating admin quota:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DASHBOARD
// ============================================

/**
 * GET Dashboard Statistics (ADMIN + BUSINESS OWNER)
 * GET /api/admin/dashboard/stats
 */
router.get('/dashboard/stats', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log('📊 GET /api/admin/dashboard/stats');
  try {
    const { organizationId, role, uid } = req.user;
    const today = new Date().toISOString().split('T')[0];

    // Run all queries in parallel for maximum performance
    const [employeeCounts, attendanceSummary, pendingLeaves, quotaInfo] = await Promise.all([
      employeeService.getEmployeeCount(organizationId),
      attendanceService.getSummary(organizationId, today),
      leaveService.getPendingLeaves(organizationId),
      role === 'admin'
        ? quotaService.getMyQuotaInfo(organizationId, uid, role)
        : role === 'business_owner'
          ? quotaService.getOrgQuotaSummary(organizationId)
          : Promise.resolve(null)
    ]);

    res.json({
      employees: employeeCounts,
      attendance: attendanceSummary,
      leaves: {
        pendingCount: pendingLeaves.length,
        pending: pendingLeaves
      },
      quota: quotaInfo
    });

  } catch (error) {
    console.error('❌ Error getting dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET My Organization Details (ADMIN + BUSINESS OWNER)
 * GET /api/admin/organization
 */
router.get('/organization', authenticateToken, requireAdminOrBusinessOwner, async (req, res) => {
  console.log('🏢 GET /api/admin/organization');
  try {
    const { organizationId } = req.user;

    // Get organization repo from container
    // Get repositories/services from container instance
    const orgRepo = container.getOrganizationRepo();
    const empService = container.getEmployeeService();

    const organization = await orgRepo.findById(organizationId);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get current counts using existing service or repo
    const employeeCounts = await empService.getEmployeeCount(organizationId);

    res.json({
      id: organization.id,
      name: organization.name,
      isActive: organization.isActive,
      createdAt: organization.createdAt,
      adminCount: employeeCounts.admins,
      employeeCount: employeeCounts.employees,
      limits: organization.limits || {}
    });

  } catch (error) {
    console.error('❌ Error getting organization details:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
