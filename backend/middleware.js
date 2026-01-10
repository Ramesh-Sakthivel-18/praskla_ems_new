const admin = require('./firebase-admin');
const container = require('./container'); // ✅ Import Container
const jwt = require('jsonwebtoken');

/**
 * Authenticate token from Authorization header
 */
async function authenticateToken(req, res, next) {
  // console.log('🔐 Middleware: authenticateToken() - Checking authentication');
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // ✅ CRITICAL FIX: Get service HERE, not at the top
    // This ensures we get the service AFTER database is connected
    const employeeService = container.getEmployeeService();

    const token = authHeader.split('Bearer ')[1];
    const firebaseAdmin = admin();
    
    try {
      // ===== STRATEGY 1: Try Firebase ID Token First =====
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      
      const employee = await employeeService.findById(decodedToken.uid);
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee record not found' });
      }

      if (employee.isActive === false) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || employee.email,
        role: employee.role,
        name: employee.name,
        department: employee.department,
        organizationId: employee.organizationId || null
      };
      return next();

    } catch (idTokenError) {
      // ===== STRATEGY 2: Try Custom Token Approach =====
      const decoded = jwt.decode(token);
      
      if (!decoded || !decoded.uid) {
        throw new Error('Invalid token structure');
      }

      let employee = null;

      // Strategy 1: Try by ID (uid)
      try {
        employee = await employeeService.findById(decoded.uid);
      } catch (e) {}

      // Strategy 2: Try by email from claims
      if (!employee && decoded.claims && decoded.claims.email) {
        try {
          console.log('🚑 Middleware: Lookup by email (claims):', decoded.claims.email);
          employee = await employeeService.findByEmail(decoded.claims.email);
        } catch (e) {
          console.log('⚠️ Middleware: Email lookup failed:', e.message);
        }
      }

      // Strategy 3: Try by direct email
      if (!employee && decoded.email) {
        try {
          console.log('🚑 Middleware: Lookup by direct email:', decoded.email);
          employee = await employeeService.findByEmail(decoded.email);
        } catch (e) {}
      }

      if (!employee) {
        console.log(`❌ Middleware: Employee not found for uid: ${decoded.uid}`);
        return res.status(404).json({ error: 'Employee record not found' });
      }

      if (employee.isActive === false) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      req.user = {
        uid: decoded.uid,
        email: employee.email,
        role: employee.role,
        name: employee.name,
        department: employee.department,
        organizationId: employee.organizationId || null
      };

      // console.log('✅ Middleware: Authentication successful for:', employee.email);
      return next();
    }
  } catch (error) {
    console.error('❌ Middleware: Authentication failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !['admin', 'businessowner', 'business_owner'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

function requireAdminOrBusinessOwner(req, res, next) {
  return requireAdmin(req, res, next);
}

function requireManager(req, res, next) {
  if (!req.user || req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

function requireEmployee(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireOrganization(organizationId) {
  return (req, res, next) => {
    if (!req.user || req.user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAdminOrBusinessOwner,
  requireManager,
  requireEmployee,
  requireOrganization
};
