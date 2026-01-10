/**
 * manager.js (UPDATED)
 * 
 * Routes for manager operations (system-wide admin).
 * Manages organizations, sets limits, activates/deactivates orgs.
 * Uses OrganizationRepository and QuotaService from container.
 */

const express = require('express');
const router = express.Router();
const container = require('../container');
const { authenticateToken, requireManager } = require('../middleware');

// Get service instances from container
const orgRepo = container.getOrganizationRepo();
const quotaService = container.getQuotaService();

/**
 * GET /api/manager/organizations
 * Get all organizations (active and inactive)
 * Manager only
 */
router.get('/organizations', authenticateToken, requireManager, async (req, res) => {
  try {
    const organizations = await orgRepo.getAllWithStats();

    res.json({
      success: true,
      count: organizations.length,
      data: organizations
    });
  } catch (error) {
    console.error('Error getting organizations:', error);
    res.status(500).json({
      error: 'Failed to get organizations',
      message: error.message
    });
  }
});

/**
 * GET /api/manager/organizations/active
 * Get all active organizations
 * Manager only
 */
router.get('/organizations/active', authenticateToken, requireManager, async (req, res) => {
  try {
    const organizations = await orgRepo.findAllActive();

    res.json({
      success: true,
      count: organizations.length,
      data: organizations
    });
  } catch (error) {
    console.error('Error getting active organizations:', error);
    res.status(500).json({
      error: 'Failed to get active organizations',
      message: error.message
    });
  }
});

/**
 * GET /api/manager/organizations/inactive
 * Get all inactive organizations
 * Manager only
 */
router.get('/organizations/inactive', authenticateToken, requireManager, async (req, res) => {
  try {
    const organizations = await orgRepo.findAllInactive();

    res.json({
      success: true,
      count: organizations.length,
      data: organizations
    });
  } catch (error) {
    console.error('Error getting inactive organizations:', error);
    res.status(500).json({
      error: 'Failed to get inactive organizations',
      message: error.message
    });
  }
});

/**
 * GET /api/manager/organizations/:orgId
 * Get specific organization by ID
 * Manager only
 */
router.get('/organizations/:orgId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { orgId } = req.params;
    const organization = await orgRepo.findById(orgId);

    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error('Error getting organization:', error);
    res.status(500).json({
      error: 'Failed to get organization',
      message: error.message
    });
  }
});

/**
 * GET /api/manager/organizations/:orgId/quota
 * Get organization quota summary
 * Manager only
 */
router.get('/organizations/:orgId/quota', authenticateToken, requireManager, async (req, res) => {
  try {
    const { orgId } = req.params;
    const quotaSummary = await quotaService.getOrgQuotaSummary(orgId);

    res.json({
      success: true,
      data: quotaSummary
    });
  } catch (error) {
    console.error('Error getting quota summary:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.status(500).json({
      error: 'Failed to get quota summary',
      message: error.message
    });
  }
});

/**
 * PUT /api/manager/organizations/:orgId/limits
 * Update organization limits
 * Manager only
 */
router.put('/organizations/:orgId/limits', authenticateToken, requireManager, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { maxBusinessOwners, maxAdmins, maxEmployees } = req.body;

    // Validate that at least one limit is being updated
    if (!maxBusinessOwners && !maxAdmins && !maxEmployees) {
      return res.status(400).json({
        error: 'No limits provided',
        message: 'At least one limit (maxBusinessOwners, maxAdmins, maxEmployees) is required'
      });
    }

    const newLimits = {};
    if (maxBusinessOwners) newLimits.maxBusinessOwners = parseInt(maxBusinessOwners);
    if (maxAdmins) newLimits.maxAdmins = parseInt(maxAdmins);
    if (maxEmployees) newLimits.maxEmployees = parseInt(maxEmployees);

    const updated = await quotaService.updateOrgLimits(orgId, newLimits);

    res.json({
      success: true,
      message: 'Organization limits updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating organization limits:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.status(500).json({
      error: 'Failed to update organization limits',
      message: error.message
    });
  }
});

/**
 * POST /api/manager/organizations/:orgId/activate
 * Activate an organization
 * Manager only
 */
router.post('/organizations/:orgId/activate', authenticateToken, requireManager, async (req, res) => {
  try {
    const { orgId } = req.params;
    const updated = await orgRepo.activate(orgId);

    res.json({
      success: true,
      message: 'Organization activated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error activating organization:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.status(500).json({
      error: 'Failed to activate organization',
      message: error.message
    });
  }
});

/**
 * POST /api/manager/organizations/:orgId/deactivate
 * Deactivate an organization
 * Manager only
 */
router.post('/organizations/:orgId/deactivate', authenticateToken, requireManager, async (req, res) => {
  try {
    const { orgId } = req.params;
    const updated = await orgRepo.deactivate(orgId);

    res.json({
      success: true,
      message: 'Organization deactivated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error deactivating organization:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.status(500).json({
      error: 'Failed to deactivate organization',
      message: error.message
    });
  }
});

/**
 * GET /api/manager/dashboard/stats
 * Get manager dashboard statistics
 * Manager only
 */
router.get('/dashboard/stats', authenticateToken, requireManager, async (req, res) => {
  try {
    const allOrgs = await orgRepo.findAll();
    
    const stats = {
      totalOrganizations: allOrgs.length,
      activeOrganizations: allOrgs.filter(org => org.isActive).length,
      inactiveOrganizations: allOrgs.filter(org => !org.isActive).length,
      totalUsers: allOrgs.reduce((sum, org) => {
        return sum + (org.counts?.businessOwners || 0) + 
               (org.counts?.admins || 0) + 
               (org.counts?.employees || 0);
      }, 0),
      totalBusinessOwners: allOrgs.reduce((sum, org) => sum + (org.counts?.businessOwners || 0), 0),
      totalAdmins: allOrgs.reduce((sum, org) => sum + (org.counts?.admins || 0), 0),
      totalEmployees: allOrgs.reduce((sum, org) => sum + (org.counts?.employees || 0), 0)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting manager dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to get dashboard statistics',
      message: error.message
    });
  }
});

module.exports = router;
