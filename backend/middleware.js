const container = require('./container');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ems-super-secret-jwt-key';

/**
 * Extract organizationId from decoded token
 */
function extractOrganizationId(decoded) {
  if (decoded.organizationId) return decoded.organizationId;
  if (decoded.claims?.organizationId) return decoded.claims.organizationId;
  return null;
}

/**
 * Authenticate token from Authorization header
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch(e) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const uid = decoded.uid || decoded.sub;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token structure' });
    }

    const organizationId = extractOrganizationId(decoded);
    let employee = null;

    const employeeService = container.getEmployeeService();
    const orgRepo = container.getOrganizationRepo();
    const userRepo = container.getUserRepo();

    // 1. Direct org lookup
    if (organizationId) {
      try {
        employee = await employeeService.getEmployeeById(organizationId, uid);
      } catch (e) {
        // Fallback
      }
    }

    // 2. System user lookup
    if (!employee) {
      try {
        const db = container.getDatabase();
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          employee = { id: userDoc.id, ...userDoc.data() };
        }
      } catch (e) {
        // Fallback
      }
    }

    // 3. Global search
    if (!employee) {
      try {
        const allOrgs = await orgRepo.findAllActive();
        for (const org of allOrgs) {
          const foundUser = await userRepo.findById(org.id, uid);
          if (foundUser) {
            employee = foundUser;
            break;
          }
        }
      } catch (e) {}
    }

    if (!employee) {
      return res.status(404).json({ error: 'Employee record not found' });
    }

    if (employee.isActive === false) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = {
      uid: employee.id,
      email: employee.email,
      role: employee.role,
      name: employee.name,
      department: employee.department,
      departmentId: employee.departmentId || null,
      organizationId: organizationId || employee.organizationId,
      isTeamLead: employee.isTeamLead || false,
      isManager: employee.isManager || false,
      isDeptHead: employee.isDeptHead || false,
      managerId: employee.managerId || null,
      managerName: employee.managerName || null,
      directReports: employee.directReports || []
    };

    return next();

  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }
  next();
}

function requireBusinessOwner(req, res, next) {
  if (!req.user || req.user.role !== 'business_owner') {
    return res.status(403).json({ error: 'Forbidden: Business Owner access only' });
  }
  next();
}

function requireAdminOrBusinessOwner(req, res, next) {
  if (!req.user || !['admin', 'business_owner'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Admin or Business Owner access required' });
  }
  next();
}

function requireSystemAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'system_admin') {
    return res.status(403).json({ error: 'Forbidden: System Admin access only' });
  }
  next();
}

function requireEmployee(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  next();
}

function requireOrganization(organizationId) {
  return (req, res, next) => {
    if (!req.user || req.user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Forbidden: Organization access denied' });
    }
    next();
  };
}

function requireTeamLead(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  const isAuthorized = req.user.isTeamLead || req.user.isDeptHead || req.user.isManager || ['admin', 'business_owner'].includes(req.user.role);
  if (!isAuthorized) return res.status(403).json({ error: 'Forbidden: Team Lead access required' });
  next();
}

function requireManagerOrHOD(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const isAuthorized = req.user.isDeptHead || req.user.isManager || ['admin', 'business_owner'].includes(req.user.role);
  if (!isAuthorized) return res.status(403).json({ error: 'Forbidden: Manager or HOD access required' });
  next();
}

function requireDeptHead(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.isDeptHead && !['admin', 'business_owner'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Department Head access required' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireBusinessOwner,
  requireAdminOrBusinessOwner,
  requireSystemAdmin,
  requireTeamLead,
  requireManagerOrHOD,
  requireDeptHead,
  requireEmployee,
  requireOrganization
};
