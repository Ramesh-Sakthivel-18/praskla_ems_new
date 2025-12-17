/**
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
      console.error('Invalid redirect path:', path);
      return;
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    console.log('Redirecting to:', path);
    router.push(path);
  } catch (error) {
    console.error('Error during redirect:', error);
    // Fallback: try to redirect to home page
    try {
      router.push('/');
    } catch (fallbackError) {
      console.error('Fallback redirect also failed:', fallbackError);
    }
  }
}

/**
 * Handle user logout with proper cleanup and redirect
 * @param {import('next/navigation').AppRouterInstance} router - Next.js router instance
 * @param {'admin'|'employee'} userType - Type of user logging out
 */
export function handleLogout(router, userType) {
  try {
    // Clear all authentication related localStorage items
    localStorage.removeItem(userType + "LoggedIn");
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("currentEmployee");
    
    // Redirect to appropriate login page
    const loginPath = `/${userType}/login`;
    safeRedirect(router, loginPath);
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if cleanup fails, still try to redirect
    safeRedirect(router, `/${userType}/login`);
  }
}