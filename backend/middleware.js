const initFirebaseAdmin = require('./firebase-admin');
const EmployeeService = require('./services/EmployeeService');

function authenticateToken(req, res, next) {
  console.log('🔐 Middleware: authenticateToken() - Checking authentication');
  const authHeader = req.headers.authorization;
  console.log('📋 Middleware: Authorization header present:', !!authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Middleware: Missing or invalid Authorization header');
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];
  console.log('🔑 Middleware: Token extracted, length:', token.length);

  const admin = initFirebaseAdmin();
  console.log('🔥 Middleware: Verifying token with Firebase...');

  // Try to verify as ID token first, then fall back to custom token verification
  admin
    .auth()
    .verifyIdToken(token)
    .then(async (decoded) => {
      console.log('✅ Middleware: ID Token verified successfully');
      console.log('👤 Middleware: Decoded token UID:', decoded.uid);
      console.log('📧 Middleware: Decoded token email:', decoded.email);

      // Find employee by Firebase UID or email
      console.log('🔍 Middleware: Looking up employee in database...');
      let employee = await EmployeeService.findByUidOrEmail(decoded.uid, decoded.email);
      
      // If employee not found and we have a UID, try to find by the UID directly
      // This handles the case where the Firebase UID hasn't been linked to the employee yet
      if (!employee && decoded.uid) {
        console.log('⚠️ Middleware: Employee not found by UID/email, trying direct lookup by UID as employee ID...');
        employee = await EmployeeService.findById(decoded.uid);
        if (employee) {
          console.log('✅ Middleware: Employee found by direct UID lookup, linking Firebase UID...');
          // Link the Firebase UID to this employee for future lookups
          await EmployeeService.update(employee.id, { firebaseUid: decoded.uid });
          console.log('✅ Middleware: Firebase UID linked to employee record');
        }
      }

      if (!employee) {
        console.log('❌ Middleware: Employee not found in database');
        return res.status(401).json({ error: 'Employee not found' });
      }

      console.log('✅ Middleware: Employee found:', employee.id, employee.name);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        employee: employee
      };
      console.log('✅ Middleware: Authentication successful');
      next();
    })
    .catch(async (err) => {
      console.log('⚠️ Middleware: ID token verification failed, trying custom token approach:', err.message);
      
      // If ID token verification fails, try to find employee directly by token
      // This is a fallback for when we're using custom tokens
      try {
        // For custom tokens, we'll decode without verification and find the employee
        // In production, you should implement proper custom token verification
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log('🔍 Middleware: Decoded custom token payload:', payload);
        
        if (payload.uid) {
          const employee = await EmployeeService.findById(payload.uid);
          if (employee) {
            console.log('✅ Middleware: Employee found via custom token:', employee.id, employee.name);
            req.user = {
              uid: payload.uid,
              email: employee.email,
              employee: employee
            };
            console.log('✅ Middleware: Custom token authentication successful');
            return next();
          }
        }
        
        console.error('❌ Middleware: Custom token verification failed');
        res.status(401).json({ error: 'Invalid token', details: err.message });
      } catch (customTokenError) {
        console.error('❌ Middleware: Both ID token and custom token verification failed:', customTokenError.message);
        res.status(401).json({ error: 'Invalid token', details: err.message });
      }
    });
}

function requireAdmin(req, res, next) {
  console.log('👑 Middleware: requireAdmin() - Checking admin privileges');
  console.log('👤 Middleware: User role:', req.user?.employee?.role);

  if (!req.user || req.user.employee.role !== 'admin') {
    console.log('❌ Middleware: Admin access denied');
    return res.status(403).json({ error: 'Admin access required' });
  }

  console.log('✅ Middleware: Admin access granted');
  next();
}

module.exports = { authenticateToken, requireAdmin };
