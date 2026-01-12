/**
 * manager.js (UPDATED - No Attendance Access)
 * 
 * Routes for System Manager:
 * - View organization info (counts, limits)
 * - Manage organizations (activate, deactivate)
 * - Set organization limits
 * - NO ACCESS to attendance data
 */

const express = require('express');
const router = express.Router();
const container = require('../container');
const { authenticateToken, requireManager } = require('../middleware');

// Get services
const organizationRepo = container.getOrganizationRepo();
const userRepo = container.getUserRepo();
const quotaService = container.getQuotaService();

// ============================================
// ORGANIZATION MANAGEMENT
// ============================================

/**
 * GET All Organizations
 * GET /api/manager/organizations
 */
router.get('/organizations', authenticateToken, requireManager, async (req, res) => {
  console.log('📋 GET /api/manager/organizations');
  try {
    const organizations = await organizationRepo.findAll();

    res.json({
      count: organizations.length,
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        isActive: org.isActive,
        counts: org.counts || {},
        limits: org.limits || {},
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      }))
    });

  } catch (error) {
    console.error('❌ Error getting organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Active Organizations
 * GET /api/manager/organizations/active
 */
router.get('/organizations/active', authenticateToken, requireManager, async (req, res) => {
  console.log('📋 GET /api/manager/organizations/active');
  try {
    const organizations = await organizationRepo.findAll();
    const activeOrgs = organizations.filter(org => org.isActive);

    res.json({
      count: activeOrgs.length,
      organizations: activeOrgs.map(org => ({
        id: org.id,
        name: org.name,
        counts: org.counts || {},
        limits: org.limits || {},
        createdAt: org.createdAt
      }))
    });

  } catch (error) {
    console.error('❌ Error getting active organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Inactive Organizations
 * GET /api/manager/organizations/inactive
 */
router.get('/organizations/inactive', authenticateToken, requireManager, async (req, res) => {
  console.log('📋 GET /api/manager/organizations/inactive');
  try {
    const organizations = await organizationRepo.findAll();
    const inactiveOrgs = organizations.filter(org => !org.isActive);

    res.json({
      count: inactiveOrgs.length,
      organizations: inactiveOrgs.map(org => ({
        id: org.id,
        name: org.name,
        counts: org.counts || {},
        limits: org.limits || {},
        deactivatedAt: org.deactivatedAt
      }))
    });

  } catch (error) {
    console.error('❌ Error getting inactive organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Organization by ID
 * GET /api/manager/organizations/:id
 */
router.get('/organizations/:id', authenticateToken, requireManager, async (req, res) => {
  console.log(`📋 GET /api/manager/organizations/${req.params.id}`);
  try {
    const { id } = req.params;

    const organization = await organizationRepo.findById(id);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get user breakdown
    const businessOwners = await userRepo.findByRole(id, 'business_owner');
    const admins = await userRepo.findByRole(id, 'admin');
    const employees = await userRepo.findByRole(id, 'employee');

    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        isActive: organization.isActive,
        counts: organization.counts || {},
        limits: organization.limits || {},
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      },
      users: {
        businessOwners: {
          count: businessOwners.length,
          users: businessOwners.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            isActive: u.isActive
          }))
        },
        admins: {
          count: admins.length,
          users: admins.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            isActive: u.isActive,
            quota: {
              created: u.adminSettings?.employeesCreated || 0,
              limit: u.adminSettings?.canCreateUpTo || 0
            }
          }))
        },
        employees: {
          count: employees.length,
          activeCount: employees.filter(e => e.isActive).length,
          inactiveCount: employees.filter(e => !e.isActive).length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting organization:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET Organization Quota Summary
 * GET /api/manager/organizations/:id/quota
 */
router.get('/organizations/:id/quota', authenticateToken, requireManager, async (req, res) => {
  console.log(`📊 GET /api/manager/organizations/${req.params.id}/quota`);
  try {
    const { id } = req.params;

    const quotaSummary = await quotaService.getOrgQuotaSummary(id);

    res.json(quotaSummary);

  } catch (error) {
    console.error('❌ Error getting quota summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * UPDATE Organization Limits
 * PUT /api/manager/organizations/:id/limits
 */
router.put('/organizations/:id/limits', authenticateToken, requireManager, async (req, res) => {
  console.log(`📝 PUT /api/manager/organizations/${req.params.id}/limits`);
  try {
    const { id } = req.params;
    const { maxBusinessOwners, maxAdmins, maxEmployees } = req.body;

    if (!maxBusinessOwners && !maxAdmins && !maxEmployees) {
      return res.status(400).json({ error: 'At least one limit must be provided' });
    }

    const newLimits = {};
    if (maxBusinessOwners) newLimits.maxBusinessOwners = parseInt(maxBusinessOwners);
    if (maxAdmins) newLimits.maxAdmins = parseInt(maxAdmins);
    if (maxEmployees) newLimits.maxEmployees = parseInt(maxEmployees);

    const organization = await quotaService.updateOrgLimits(id, newLimits);

    res.json({
      message: 'Organization limits updated successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        limits: organization.limits
      }
    });

  } catch (error) {
    console.error('❌ Error updating org limits:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ACTIVATE Organization
 * POST /api/manager/organizations/:id/activate
 */
router.post('/organizations/:id/activate', authenticateToken, requireManager, async (req, res) => {
  console.log(`✅ POST /api/manager/organizations/${req.params.id}/activate`);
  try {
    const { id } = req.params;

    const organization = await organizationRepo.activate(id);

    res.json({
      message: 'Organization activated successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        isActive: organization.isActive
      }
    });

  } catch (error) {
    console.error('❌ Error activating organization:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DEACTIVATE Organization
 * POST /api/manager/organizations/:id/deactivate
 */
router.post('/organizations/:id/deactivate', authenticateToken, requireManager, async (req, res) => {
  console.log(`❌ POST /api/manager/organizations/${req.params.id}/deactivate`);
  try {
    const { id } = req.params;

    const organization = await organizationRepo.deactivate(id);

    res.json({
      message: 'Organization deactivated successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        isActive: organization.isActive
      }
    });

  } catch (error) {
    console.error('❌ Error deactivating organization:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MANAGER DASHBOARD (NO ATTENDANCE DATA)
// ============================================

/**
 * GET Manager Dashboard Statistics
 * GET /api/manager/dashboard/stats
 * 
 * Returns ONLY organization info, counts, limits
 * NO attendance data
 */
router.get('/dashboard/stats', authenticateToken, requireManager, async (req, res) => {
  console.log('📊 GET /api/manager/dashboard/stats');
  try {
    const organizations = await organizationRepo.findAll();

    // Calculate system-wide statistics
    const stats = {
      system: {
        totalOrganizations: organizations.length,
        activeOrganizations: organizations.filter(o => o.isActive).length,
        inactiveOrganizations: organizations.filter(o => !o.isActive).length
      },
      
      // Aggregate user counts across all organizations
      users: {
        totalBusinessOwners: organizations.reduce((sum, o) => sum + (o.counts?.businessOwners || 0), 0),
        totalAdmins: organizations.reduce((sum, o) => sum + (o.counts?.admins || 0), 0),
        totalEmployees: organizations.reduce((sum, o) => sum + (o.counts?.employees || 0), 0),
        grandTotal: 0 // Will calculate below
      },
      
      // Organization details
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        isActive: org.isActive,
        
        // User counts (NO ATTENDANCE)
        counts: {
          businessOwners: org.counts?.businessOwners || 0,
          admins: org.counts?.admins || 0,
          employees: org.counts?.employees || 0,
          total: (org.counts?.businessOwners || 0) + 
                 (org.counts?.admins || 0) + 
                 (org.counts?.employees || 0)
        },
        
        // Limits
        limits: {
          maxBusinessOwners: org.limits?.maxBusinessOwners || 0,
          maxAdmins: org.limits?.maxAdmins || 0,
          maxEmployees: org.limits?.maxEmployees || 0
        },
        
        // Utilization percentages
        utilization: {
          businessOwnersPercent: org.limits?.maxBusinessOwners 
            ? Math.round((org.counts?.businessOwners || 0) / org.limits.maxBusinessOwners * 100)
            : 0,
          adminsPercent: org.limits?.maxAdmins
            ? Math.round((org.counts?.admins || 0) / org.limits.maxAdmins * 100)
            : 0,
          employeesPercent: org.limits?.maxEmployees
            ? Math.round((org.counts?.employees || 0) / org.limits.maxEmployees * 100)
            : 0
        }
      }))
    };

    // Calculate grand total
    stats.users.grandTotal = stats.users.totalBusinessOwners + 
                            stats.users.totalAdmins + 
                            stats.users.totalEmployees;

    res.json(stats);

  } catch (error) {
    console.error('❌ Error getting manager dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
