'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    let currentUser = null;
    const storedUser = localStorage.getItem('customerUser');

    if (storedUser && storedUser !== "undefined") {
        try {
            currentUser = JSON.parse(storedUser);
        } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            localStorage.removeItem('customerUser');
        }
    }

    // If we have a stored user with LINE ID, try to refresh their profile from server
    if (currentUser && currentUser.lineUserId) {
        try {
            const lineToken = `line.${currentUser.lineUserId}`;
            const response = await fetch('/api/customer/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${lineToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.user) {
                    // Update stored user with fresh data
                    currentUser = data.user;
                    localStorage.setItem('customerUser', JSON.stringify(currentUser));
                }
            } else if (response.status === 401 || response.status === 404) {
                // User no longer exists or token is invalid, clear stored data
                localStorage.removeItem('customerUser');
                currentUser = null;
            }
        } catch (error) {
            console.error("Error refreshing LINE user profile:", error);
            // Keep existing user data if refresh fails
        }
    }
    
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
    
    // Listen for LINE user login events
    const handleLineUserLogin = (event) => {
      setUser(event.detail);
      setLoading(false);
    };

    const handleCustomerUserLogin = (event) => {
      setUser(event.detail);
      setLoading(false);
    };
    
    window.addEventListener('lineUserLogin', handleLineUserLogin);
    window.addEventListener('customerUserLogin', handleCustomerUserLogin);
    
    return () => {
      window.removeEventListener('lineUserLogin', handleLineUserLogin);
      window.removeEventListener('customerUserLogin', handleCustomerUserLogin);
    };
  }, [fetchUser]);

  const login = (userData) => {
    localStorage.setItem('customerUser', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      // Call the backend to clear the HttpOnly cookie
      await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
      console.error("Failed to call logout API:", error);
    } finally {
      // Always clear local state and storage regardless of API call success
      localStorage.removeItem('customerUser');
      localStorage.removeItem('customerToken');
      setUser(null);
      // Redirect to home page after logout
      window.location.href = '/';
    }
  };

  // Get authentication token for API calls
  const getAuthToken = useCallback(() => {
    const customerToken = localStorage.getItem('customerToken');
    if (customerToken) {
      return customerToken;
    }
    if (user && user.lineUserId) {
      return `line.${user.lineUserId}`;
    }
    return null;
  }, [user]);

  // Add a manual refresh function
  const refreshUser = useCallback(() => {
    fetchUser();
  }, [fetchUser]);

  const value = { 
    user, 
    loading, 
    login, 
    logout, 
    refetchUser: fetchUser, 
    refreshUser, 
    getAuthToken 
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 
