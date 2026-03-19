/**
 * lib/auth.js
 * Centralized authentication helper functions
 */

// ✅ Consistent API URL (base server URL, /api appended by getApiBase)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const getApiBase = () => API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

/**
 * Login helper - calls backend and handles auth
 * @param {string} email
 * @param {string} password
 * @param {string} organizationId - Optional organization ID (NOT a role string)
 * @param {string} expectedRole - Optional role to validate after login (e.g. 'admin', 'business_owner')
 * @returns {Promise} { success: boolean, user: Object, error: string }
 */
export async function loginUser(email, password, organizationId = null, expectedRole = null) {
  try {
    console.log('🔐 Auth: Starting login for', email);

    const body = { email, password };
    if (organizationId) {
      body.organizationId = organizationId;
    }

    const response = await fetch(`${getApiBase()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('📊 Auth: Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error || errorData?.message || `Login failed (${response.status})`;
      console.error('❌ Auth: Login failed:', errorMessage);
      return { success: false, error: errorMessage };
    }

    const data = await response.json();
    console.log('✅ Auth: Login successful, role:', data.user?.role);

    // Validate role if expected (system_admin can bypass)
    if (expectedRole && data.user?.role !== expectedRole && data.user?.role !== 'system_admin') {
      console.error(`❌ Auth: Role mismatch. Expected: ${expectedRole}, Got: ${data.user?.role}`);
      return {
        success: false,
        error: `Access denied. You are logged in as ${data.user?.role}, but this portal is for ${expectedRole}s.`
      };
    }

    // Set local token
    let idToken = data.token;

    // Store authentication data
    const authData = {
      isLoggedIn: true,
      token: idToken,
      user: data.user
    };
    storeAuthData(authData);
    console.log('💾 Auth: Stored auth data in localStorage');

    return {
      success: true,
      user: data.user,
      organizationId: data.user.organizationId,
      token: idToken
    };
  } catch (error) {
    console.error('❌ Auth: Network error:', error);
    return {
      success: false,
      error: 'Network error. Please check if the backend is running.'
    };
  }
}

/**
 * Login with Google
 * @param {string} role - 'employee' | 'admin' | 'business_owner'
 */
export async function loginWithGoogle(role = 'employee') {
  throw new Error("Google Login Disabled (Local Auth Only)");
}

/**
 * Register organization (for business owner)
 */
export async function registerOrganization(data) {
  try {
    console.log('📝 Auth: Registering organization:', data.organizationName);

    const response = await fetch(`${getApiBase()}/auth/register/organization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error || 'Registration failed';
      console.error('❌ Auth: Registration failed:', errorMessage);
      return { success: false, error: errorMessage };
    }

    const result = await response.json();
    console.log('✅ Auth: Registration successful');
    
    // Store credentials cleanly without using SDK firebase methods
    if (result.token) {
        storeAuthData({
            isLoggedIn: true,
            token: result.token,
            user: result.user
        });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Auth: Registration error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store authentication data in localStorage
 */
export function storeAuthData({ isLoggedIn, token, user }) {
  try {
    localStorage.setItem('isLoggedIn', String(isLoggedIn));
    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(user));

    // Role-specific flags (for backward compatibility)
    if (user.role === 'admin') {
      localStorage.setItem('adminLoggedIn', 'true');
    } else if (user.role === 'employee') {
      localStorage.setItem('employeeLoggedIn', 'true');
    } else if (user.role === 'business_owner') {
      localStorage.setItem('businessOwnerLoggedIn', 'true');
    } else if (user.role === 'system_admin') {
      localStorage.setItem('systemAdminLoggedIn', 'true');
    }
  } catch (error) {
    console.error('❌ Failed to store auth data:', error);
  }
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

/**
 * Get auth token
 */
export function getAuthToken() {
  try {
    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
}

/**
 * Check if user is logged in
 */
export function isAuthenticated() {
  try {
    return localStorage.getItem('isLoggedIn') === 'true';
  } catch {
    return false;
  }
}

/**
 * Logout user
 */
export function logoutUser() {
  try {
    // Clear all auth data
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('employeeLoggedIn');
    localStorage.removeItem('businessOwnerLoggedIn');
    localStorage.removeItem('systemAdminLoggedIn');

    console.log('👋 User logged out');
  } catch (error) {
    console.error('❌ Logout error:', error);
  }
}

/**
 * Clear all React Query caches (call on logout to prevent data leaks)
 * @param {QueryClient} queryClient - React Query client instance
 */
export function clearAllCaches(queryClient) {
  if (queryClient) {
    queryClient.clear();
    console.log('🧹 All React Query caches cleared');
  }
}

/**
 * Get role-specific redirect path
 */
export function getRoleRedirectPath(role) {
  const paths = {
    'admin': '/admin/dashboard',
    'business_owner': '/business-owner/dashboard',
    'employee': '/employee/dashboard',
    'system_admin': '/system-admin/dashboard'
  };
  return paths[role] || '/role-selection';
}
