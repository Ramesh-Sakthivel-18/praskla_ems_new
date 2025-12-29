const express = require('express');
const router = express.Router();
const LeaveService = require('../services/LeaveService');
const { authenticateToken, requireAdmin } = require('../middleware');

console.log('📄 Leave routes loaded');

// GET /api/leave/all - Get all leave requests (Admin only)
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  console.log('🔍 LeaveRoutes: GET /all - Fetching all leave requests');
  console.log('👤 Requested by:', req.user?.email || req.user?.uid);
  
  try {
    const leaves = await LeaveService.getAll();  // ✅ Changed from getAllLeaves()
    console.log('✅ LeaveRoutes: Found', leaves.length, 'leave requests');
    
    res.json({ 
      success: true,
      requests: leaves 
    });
  } catch (error) {
    console.error('❌ LeaveRoutes: Error fetching leaves:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch leave requests',
      message: error.message 
    });
  }
});

// GET /api/leave/employee/:employeeId - Get leaves for specific employee
router.get('/employee/:employeeId', authenticateToken, async (req, res) => {
  console.log('🔍 LeaveRoutes: GET /employee/:employeeId');
  
  try {
    const { employeeId } = req.params;
    
    // Admins can view any employee's leaves, employees can only view their own
    if (req.user.role !== 'admin' && req.user.uid !== employeeId) {
      console.log('❌ LeaveRoutes: Unauthorized access attempt');
      return res.status(403).json({ 
        success: false,
        error: 'You can only view your own leave requests' 
      });
    }

    const leaves = await LeaveService.getByEmployee(employeeId);  // ✅ Correct method
    console.log('✅ LeaveRoutes: Found', leaves.length, 'leaves for employee');
    
    res.json({ 
      success: true,
      requests: leaves 
    });
  } catch (error) {
    console.error('❌ LeaveRoutes: Error fetching employee leaves:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch leave requests' 
    });
  }
});

// POST /api/leave/request - Submit new leave request
router.post('/request', authenticateToken, async (req, res) => {
  console.log('🔍 LeaveRoutes: POST /request');
  console.log('📝 Request body:', req.body);
  
  try {
    const leaveData = {
      ...req.body,
      employeeId: req.user.uid,
      employeeName: req.user.name || req.user.email
    };

    const leaveRequest = await LeaveService.create(leaveData);  // ✅ Correct method
    console.log('✅ LeaveRoutes: Leave request created:', leaveRequest.id);
    
    res.status(201).json({ 
      success: true,
      request: leaveRequest 
    });
  } catch (error) {
    console.error('❌ LeaveRoutes: Error creating leave request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create leave request',
      message: error.message 
    });
  }
});

// PUT /api/leave/:id/status - Update leave request status (Admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  console.log('🔍 LeaveRoutes: PUT /:id/status');
  console.log('📝 Request params:', req.params);
  console.log('📝 Request body:', req.body);
  
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid status. Must be Approved or Rejected' 
      });
    }

    const updatedLeave = await LeaveService.updateStatus(id, status);  // ✅ Correct method
    console.log('✅ LeaveRoutes: Leave status updated:', id);
    
    res.json({ 
      success: true,
      request: updatedLeave 
    });
  } catch (error) {
    console.error('❌ LeaveRoutes: Error updating leave status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update leave status',
      message: error.message 
    });
  }
});

// GET /api/leave/:id - Get single leave request by ID
router.get('/:id', authenticateToken, async (req, res) => {
  console.log('🔍 LeaveRoutes: GET /:id');
  
  try {
    const { id } = req.params;
    const leave = await LeaveService.getById(id);  // ✅ Correct method
    
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        error: 'Leave request not found' 
      });
    }
    
    // Check access rights
    if (req.user.role !== 'admin' && req.user.uid !== leave.employeeId) {
      return res.status(403).json({ 
        success: false,
        error: 'You can only view your own leave requests' 
      });
    }
    
    console.log('✅ LeaveRoutes: Leave request found');
    res.json({ 
      success: true,
      request: leave 
    });
  } catch (error) {
    console.error('❌ LeaveRoutes: Error fetching leave:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch leave request' 
    });
  }
});

// DELETE /api/leave/:id - Delete leave request (Admin only or own request if pending)
router.delete('/:id', authenticateToken, async (req, res) => {
  console.log('🔍 LeaveRoutes: DELETE /:id');
  
  try {
    const { id } = req.params;
    const leave = await LeaveService.getById(id);
    
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        error: 'Leave request not found' 
      });
    }
    
    // Only admins or employee (if pending) can delete
    if (req.user.role !== 'admin' && 
        (req.user.uid !== leave.employeeId || leave.status !== 'Pending')) {
      return res.status(403).json({ 
        success: false,
        error: 'You can only delete your own pending leave requests' 
      });
    }
    
    await db.collection('leaves').doc(id).delete();
    console.log('✅ LeaveRoutes: Leave request deleted:', id);
    
    res.json({ 
      success: true,
      message: 'Leave request deleted successfully' 
    });
  } catch (error) {
    console.error('❌ LeaveRoutes: Error deleting leave:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete leave request' 
    });
  }
});

module.exports = router;
