import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { onLogout } from '../api/client';
import { authSync } from '../utils/authSync';
import { tokenStorage } from '../utils/tokenStorage';
import { API_BASE_URL } from '../api/config';

// User roles constants
export const USER_ROLES = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
};

// Create the context
const AuthContext = createContext(null);

// Auth reducer for state management
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

/**
 * AuthProvider - Provides authentication state and methods to the app
 */
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * Check authentication status on mount
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Option 1: Fast check - look for user data in localStorage (for UI responsiveness)
        // We can do this temporarily while verifying with the backend
        const cachedUser = tokenStorage.getUserData();
        if (cachedUser) {
          dispatch({ type: 'LOGIN', payload: cachedUser });
        }

        // Option 2: Secure check - verify session with backend
        const response = await fetch(`${API_BASE_URL}/auth/me/`, {
          method: 'GET',
          credentials: 'include', // Send cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          // Session is valid - update state
          dispatch({ type: 'LOGIN', payload: userData });

          // Note: We can choose to keep or remove localStorage sync here.
          // To satisfy the "Empty localStorage" requirement, we could remove it locally:
          // tokenStorage.clearAll(); 
          // BUT: for better UX (persistence on refresh without flicker), keeping it is standard.
          // The user specifically asked for "Empty localStorage", so let's clear it!

          tokenStorage.removeUserData(); // Clear from localStorage for security requirement
        } else {
          // Session is invalid
          if (cachedUser) {
            // If we had cached user but backend says no, logout!
            tokenStorage.clearAll();
            dispatch({ type: 'LOGOUT' });
          } else {
            dispatch({ type: 'LOGOUT' });
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        tokenStorage.clearAll();
        dispatch({ type: 'LOGOUT' });
      }
    };

    checkAuth();
  }, []);

  /**
   * Listen for cross-tab auth events
   */
  useEffect(() => {
    const cleanup = authSync.onAuthEvent((event) => {
      if (event.type === 'LOGIN') {
        dispatch({ type: 'LOGIN', payload: event.user });
      } else if (event.type === 'LOGOUT') {
        tokenStorage.clearAll();
        dispatch({ type: 'LOGOUT' });
      }
    });

    return cleanup;
  }, []);

  /**
   * Listen for global logout event (from API client)
   */
  useEffect(() => {
    const cleanup = onLogout(() => {
      tokenStorage.clearAll();
      dispatch({ type: 'LOGOUT' });
    });

    return cleanup;
  }, []);

  /**
   * Login - Authenticate user with credentials
   * Uses secure JWT tokens in httpOnly cookies
   */
  const login = useCallback(async (username, password, stayLoggedIn = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    console.log('Login called with:', { username, password: password ? '***' : 'EMPTY' });
    const requestBody = { AccountID: username, AccountPass: password };
    console.log('Sending request body:', requestBody);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        credentials: 'include',  // CRITICAL: Send/receive cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          AccountID: username,
          AccountPass: password,
          stayLoggedIn: stayLoggedIn
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If response is not JSON (e.g. 500 HTML page)
        console.error('Login response parse error:', parseError);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      console.log('Secure login response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Backend returns: { message: "Login successful", user: {...} }
      // Tokens are in httpOnly cookies (not accessible to JavaScript)
      const userData = data.user;

      // Store in localStorage
      // OPTIONAL: Store in localStorage for persistence
      // For "Zero LocalStorage" security, we DO NOT store it.
      // tokenStorage.setUserData(userData);
      tokenStorage.removeUserData(); // Ensure it's empty

      // Update local state
      dispatch({ type: 'LOGIN', payload: userData });

      // Broadcast to other tabs
      authSync.broadcastLogin(userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login exception:', error);
      const message = error.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    }
  }, []);



  /**
   * Logout - Clear authentication
   */
  const logout = useCallback(async () => {
    try {
      const token = tokenStorage.getAccessToken();
      if (token) {
        await fetch(`${API_BASE_URL}/logout/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => { });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenStorage.clearAll();
      dispatch({ type: 'LOGOUT' });
      authSync.broadcastLogout();
    }
  }, []);

  /**
   * Update user data
   */
  const updateUser = useCallback((newUserData) => {
    const updatedUser = { ...state.user, ...newUserData };
    tokenStorage.setUserData(updatedUser);
    dispatch({ type: 'UPDATE_USER', payload: newUserData });
  }, [state.user]);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((role) => {
    return state.user?.role === role;
  }, [state.user]);

  /**
   * Check if user is a student
   */
  const isStudent = useCallback(() => {
    return hasRole(USER_ROLES.STUDENT);
  }, [hasRole]);

  /**
   * Check if user is faculty
   */
  const isFaculty = useCallback(() => {
    return hasRole(USER_ROLES.FACULTY);
  }, [hasRole]);

  /**
   * Get current access token
   */
  const getToken = useCallback(() => {
    return tokenStorage.getAccessToken();
  }, []);

  /**
   * Clear auth error
   */
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    authError: state.error,

    // Methods
    login,
    logout,
    updateUser,
    hasRole,
    isStudent,
    isFaculty,
    getToken,
    clearError,

    // Constants
    roles: USER_ROLES,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuthContext - Hook to access auth context
 */
export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
