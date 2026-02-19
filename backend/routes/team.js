/**
 * team.js
 * 
 * Routes for Team Lead management.
 * Accessible by Team Leads, Admins, and Business Owners.
 */

const express = require('express');
const router = express.Router();
const container = require('../container');
const { authenticateToken, requireTeamLead } = require('../middleware');

// Get services
const userService = container.getUserRepo(); // Direct repo access for simple queries
const attendanceService = container.getAttendanceService();
const leaveService = container.getLeaveService();

// Middleware to ensure user is authenticated and authorized as a team lead
router.use(authenticateToken, requireTeamLead);

/**
 * GET /api/team/members
 * Get all direct reports
 */
router.get('/members', async (req, res) => {
    try {
        const { organizationId, uid } = req.user;

        // Get direct reports using the repository method we added
        const members = await userService.getDirectReports(organizationId, uid);

        // Remove sensitive data
        const safeMembers = members.map(m => {
            const { passwordHash, ...safe } = m;
            return safe;
        });

        res.json({
            count: safeMembers.length,
            members: safeMembers
        });
    } catch (error) {
        console.error('❌ Error getting team members:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/team/attendance
 * Get today's attendance for the team
 */
router.get('/attendance', async (req, res) => {
    try {
        const { organizationId, uid } = req.user;
        const date = req.query.date || new Date().toISOString().split('T')[0];

        const teamAttendance = await attendanceService.getTeamAttendance(organizationId, uid, date);

        res.json({
            date,
            count: teamAttendance.length,
            attendance: teamAttendance
        });
    } catch (error) {
        console.error('❌ Error getting team attendance:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/team/attendance/weekly
 * Get weekly hours for the team
 */
router.get('/attendance/weekly', async (req, res) => {
    try {
        const { organizationId, uid } = req.user;
        const { weekStart, weekEnd } = req.query;

        if (!weekStart || !weekEnd) {
            return res.status(400).json({ error: 'weekStart and weekEnd are required' });
        }

        const teamHours = await attendanceService.getTeamWeeklyHours(organizationId, uid, weekStart, weekEnd);

        res.json({
            weekStart,
            weekEnd,
            data: teamHours
        });
    } catch (error) {
        console.error('❌ Error getting team weekly hours:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/team/leaves/pending
 * Get pending leave requests assigned to me
 */
router.get('/leaves/pending', async (req, res) => {
    try {
        const { organizationId, uid } = req.user;

        const pendingLeaves = await leaveService.getTeamPendingLeaves(organizationId, uid);

        res.json({
            count: pendingLeaves.length,
            leaves: pendingLeaves
        });
    } catch (error) {
        console.error('❌ Error getting pending team leaves:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/team/leaves/:id/approve
 * Approve a leave request (as a team lead)
 */
router.post('/leaves/:id/approve', async (req, res) => {
    try {
        const { organizationId, uid, name } = req.user;
        const { id } = req.params;
        const { comments } = req.body;

        // Verify the leave is assigned to this user (security check)
        const leave = await leaveService.getLeaveById(organizationId, id);
        if (!leave) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        if (leave.approverId !== uid && req.user.role !== 'admin' && req.user.role !== 'business_owner') {
            return res.status(403).json({ error: 'You are not the assigned approver for this leave request' });
        }

        const updatedLeave = await leaveService.approveLeave(organizationId, id, uid, comments);

        res.json({
            message: 'Leave request approved',
            leave: updatedLeave
        });
    } catch (error) {
        console.error('❌ Error approving leave:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/team/leaves/:id/reject
 * Reject a leave request (as a team lead)
 */
router.post('/leaves/:id/reject', async (req, res) => {
    try {
        const { organizationId, uid, name } = req.user;
        const { id } = req.params;
        const { comments } = req.body;

        if (!comments) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        // Verify the leave is assigned to this user
        const leave = await leaveService.getLeaveById(organizationId, id);
        if (!leave) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        if (leave.approverId !== uid && req.user.role !== 'admin' && req.user.role !== 'business_owner') {
            return res.status(403).json({ error: 'You are not the assigned approver for this leave request' });
        }

        const updatedLeave = await leaveService.rejectLeave(organizationId, id, uid, comments);

        res.json({
            message: 'Leave request rejected',
            leave: updatedLeave
        });
    } catch (error) {
        console.error('❌ Error rejecting leave:', error);
        res.status(500).json({ error: error.message });
    }
});



/**
 * GET /api/team/leaves/history
 * Get approved/rejected leave requests
 */
router.get('/leaves/history', async (req, res) => {
    try {
        const { organizationId, uid } = req.user;

        const history = await leaveService.getTeamLeaveHistory(organizationId, uid);

        res.json({
            count: history.length,
            leaves: history
        });
    } catch (error) {
        console.error('❌ Error getting team leave history:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
