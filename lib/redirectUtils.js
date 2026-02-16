/**
 * lib/redirectUtils.js
 * Utility functions for handling redirects safely in the application
 */

/**
 * Safely redirect to a path with error handling
 * @param {import('next/navigation').AppRouterInstance} router - Next.js router instance
 * @param {string} path - Path to redirect to
 */
export function safeRedirect(router, path) {
  try {
    // Validate path format
    if (!path || typeof path !== 'string') {
      console.error('⚠️ Invalid redirect path:', path);
      return;
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Prevent protocol-relative URLs (//evil.com)
    if (path.startsWith('//')) {
      console.warn('⚠️ Protocol-relative URL blocked:', path);
      router.push('/role-selection');
      return;
    }

    // Prevent javascript: URLs
    if (path.toLowerCase().startsWith('javascript:')) {
      console.warn('⚠️ JavaScript URL blocked:', path);
      router.push('/role-selection');
      return;
    }

    console.log('✅ Redirecting to:', path);
    router.push(path);
  } catch (error) {
    console.error('❌ Error during redirect:', error);
    // Fallback: try to redirect to home page
    try {
      router.push('/');
    } catch (fallbackError) {
      console.error('❌ Fallback redirect also failed:', fallbackError);
    }
  }
}

/**
 * Handle user logout with proper cleanup and redirect
 * @param {import('next/navigation').AppRouterInstance} router - Next.js router instance
 * @param {'admin'|'employee'|'business_owner'|'system_admin'} userType - Type of user logging out
 */
export function handleLogout(router, userType = null) {
  try {
    // Clear all authentication related localStorage items
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('firebaseToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('employeeLoggedIn');
    localStorage.removeItem('businessOwnerLoggedIn');
    localStorage.removeItem('businessOwnerLoggedIn');
    localStorage.removeItem('systemAdminLoggedIn');

    // Redirect to appropriate login page
    let loginPath = '/role-selection';
    if (userType) {
      const loginPaths = {
        'admin': '/admin/login',
        'employee': '/employee/login',
        'business_owner': '/business-owner/login',
        'system_admin': '/system-admin/login'
      };
      loginPath = loginPaths[userType] || '/role-selection';
    }

    safeRedirect(router, loginPath);
  } catch (error) {
    console.error('❌ Error during logout:', error);
    // Even if cleanup fails, still try to redirect
    safeRedirect(router, '/role-selection');
  }
}

/**
 * Role-based redirect after login
 * @param {import('next/navigation').AppRouterInstance} router - Next.js router instance
 * @param {string} role - User role
 */
export function redirectByRole(router, role) {
  const roleRoutes = {
    'admin': '/admin/dashboard',
    'business_owner': '/business-owner/dashboard',
    'employee': '/employee/dashboard',
    'business_owner': '/business-owner/dashboard',
    'employee': '/employee/dashboard',
    'system_admin': '/system-admin/dashboard'
  };

  const destination = roleRoutes[role] || '/role-selection';
  console.log(`✅ Redirecting ${role} to ${destination}`);
  safeRedirect(router, destination);
}

/**
 * Redirect to login page with return URL
 * @param {import('next/navigation').AppRouterInstance} router - Next.js router instance
 * @param {string} role - User role for which login page
 * @param {string} returnUrl - URL to return to after login
 */
export function redirectToLogin(router, role = null, returnUrl = null) {
  let loginPath = '/role-selection';

  if (role) {
    const loginRoutes = {
      'admin': '/admin/login',
      'business_owner': '/business-owner/login',
      'employee': '/employee/login',
      'employee': '/employee/login',
      'system_admin': '/system-admin/login'
    };
    loginPath = loginRoutes[role] || '/role-selection';
  }

  if (returnUrl) {
    loginPath += `?returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  console.log('🔒 Redirecting to login:', loginPath);
  safeRedirect(router, loginPath);
}
