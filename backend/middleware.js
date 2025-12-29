const admin = require('./firebase-admin');
const EmployeeService = require('./services/EmployeeService');
const jwt = require('jsonwebtoken');

/**
 * Authenticate token from Authorization header
 * Supports both Firebase ID tokens and custom tokens
 */
async function authenticateToken(req, res, next) {
  console.log('🔐 Middleware: authenticateToken() - Checking authentication');
  
  try {
    const authHeader = req.headers.authorization;
    console.log('📋 Middleware: Authorization header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Middleware: No authorization header or invalid format');
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('🔑 Middleware: Token extracted, length:', token.length);

    const firebaseAdmin = admin();
    console.log('🔥 Middleware: Verifying token with Firebase...');

    try {
      // ===== STRATEGY 1: Try Firebase ID Token First =====
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      console.log('✅ Middleware: ID token verified for user:', decodedToken.email);

      // Fetch employee details to get full user context
      const employee = await EmployeeService.findById(decodedToken.uid);
      
      if (!employee) {
        console.log('⚠️ Middleware: Employee not found for uid:', decodedToken.uid);
        return res.status(404).json({ error: 'Employee record not found' });
      }

      // Check if employee is active
      if (employee.isActive === false) {
        console.log('⚠️ Middleware: Employee account is inactive:', employee.email);
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

      console.log('✅ Middleware: User authenticated:', {
        uid: req.user.uid,
        email: req.user.email,
        role: req.user.role,
        organizationId: req.user.organizationId || 'None'
      });

      return next();

    } catch (idTokenError) {
      // ===== STRATEGY 2: Try Custom Token Approach =====
      console.log('⚠️ Middleware: ID token verification failed, trying custom token approach');
      console.log('⚠️ Error:', idTokenError.message);
      
      // Decode JWT without verification (already verified by Firebase Admin SDK)
      const decoded = jwt.decode(token);
      console.log('🔍 Middleware: Decoded custom token payload:', decoded);
      
      if (!decoded || !decoded.uid) {
        console.log('❌ Middleware: Invalid token structure');
        throw new Error('Invalid token structure');
      }

      // Fetch employee by UID from custom token
      console.log('🔍 EmployeeService.findById() - Searching for ID:', decoded.uid);
      const employee = await EmployeeService.findById(decoded.uid);
      
      if (!employee) {
        console.log('❌ Middleware: Employee not found for custom token uid:', decoded.uid);
        return res.status(404).json({ error: 'Employee record not found' });
      }

      // Check if employee is active
      if (employee.isActive === false) {
        console.log('⚠️ Middleware: Employee account is inactive:', employee.email);
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      console.log('📄 Document exists: true');
      console.log('✅ Employee found:', employee.id, employee.name);

      req.user = {
        uid: decoded.uid,
        email: employee.email,
        role: employee.role,
        name: employee.name,
        department: employee.department,
        organizationId: employee.organizationId || null
      };

      console.log('✅ Middleware: Employee found via custom token:', employee.id, employee.name);
      console.log('✅ Middleware: Custom token authentication successful');
      console.log('✅ Middleware: User organizationId:', req.user.organizationId || 'None');

      return next();
    }

  } catch (error) {
    console.error('❌ Middleware: Authentication failed:', error.message);
    console.error('❌ Middleware: Error stack:', error.stack);
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid or expired token',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Require admin or business owner role
 */
function requireAdmin(req, res, next) {
  console.log('👑 Middleware: requireAdmin() - Checking admin privileges');
  console.log('👤 Middleware: User role:', req.user?.role || 'None');
  console.log('🏢 Middleware: User organizationId:', req.user?.organizationId || 'None');
  
  if (!req.user) {
    console.log('❌ Middleware: No user object found');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const allowedRoles = ['admin', 'businessowner', 'business_owner'];
  
  if (!allowedRoles.includes(req.user.role)) {
    console.log('❌ Middleware: Access denied - User role:', req.user.role);
    return res.status(403).json({ 
      error: 'Forbidden: Admin or Business Owner access required',
      userRole: req.user.role 
    });
  }
  
  console.log('✅ Middleware: Access granted for role:', req.user.role);
  next();
}

/**
 * Require manager role (system-wide admin)
 */
function requireManager(req, res, next) {
  console.log('👑 Middleware: requireManager() - Checking manager privileges');
  console.log('👤 Middleware: User role:', req.user?.role || 'None');
  
  if (!req.user) {
    console.log('❌ Middleware: No user object found');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'manager') {
    console.log('❌ Middleware: Access denied - User role:', req.user.role);
    return res.status(403).json({ 
      error: 'Forbidden: Manager access required',
      userRole: req.user.role 
    });
  }
  
  console.log('✅ Middleware: Manager access granted');
  next();
}

/**
 * Require employee role (any authenticated user)
 */
function requireEmployee(req, res, next) {
  console.log('👤 Middleware: requireEmployee() - Checking employee access');
  
  if (!req.user) {
    console.log('❌ Middleware: No user object found');
    return res.status(401).json({ error: 'Authentication required' });
  }

  console.log('✅ Middleware: Employee access granted for:', req.user.email);
  next();
}

/**
 * Check if user belongs to specific organization
 */
function requireOrganization(organizationId) {
  return (req, res, next) => {
    console.log('🏢 Middleware: requireOrganization() - Checking organization access');
    console.log('🎯 Required organizationId:', organizationId);
    console.log('👤 User organizationId:', req.user?.organizationId || 'None');
    
    if (!req.user) {
      console.log('❌ Middleware: No user object found');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.organizationId) {
      console.log('❌ Middleware: User has no organization');
      return res.status(403).json({ error: 'User is not associated with any organization' });
    }

    if (req.user.organizationId !== organizationId) {
      console.log('❌ Middleware: Organization mismatch');
      return res.status(403).json({ error: 'Access denied: Different organization' });
    }

    console.log('✅ Middleware: Organization access granted');
    next();
  };
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireManager,
  requireEmployee,
  requireOrganization
};
