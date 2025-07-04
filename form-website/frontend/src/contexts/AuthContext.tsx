import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = () => {
      const authData = localStorage.getItem('auth');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          // Check if auth is still valid (not expired)
          const now = new Date().getTime();
          if (parsed.expires && now < parsed.expires) {
            setIsAuthenticated(true);
          } else {
            // Auth expired, remove it
            localStorage.removeItem('auth');
          }
        } catch (error) {
          // Invalid auth data, remove it
          localStorage.removeItem('auth');
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Create Basic Auth header
      const credentials = btoa(`${username}:${password}`);
      
      // Test auth with backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Store auth info (expires in 8 hours)
        const authData = {
          credentials,
          expires: new Date().getTime() + (8 * 60 * 60 * 1000), // 8 hours
          username: username
        };
        
        localStorage.setItem('auth', JSON.stringify(authData));
        setIsAuthenticated(true);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth');
    setIsAuthenticated(false);
  };

  // Get stored credentials for API calls
  const getAuthHeaders = (): { Authorization?: string } => {
    const authData = localStorage.getItem('auth');
    if (authData && isAuthenticated) {
      try {
        const parsed = JSON.parse(authData);
        return { Authorization: `Basic ${parsed.credentials}` };
      } catch (error) {
        return {};
      }
    }
    return {};
  };

  // Add auth headers to window for API service to use
  useEffect(() => {
    (window as any).getAuthHeaders = getAuthHeaders;
  }, [isAuthenticated]);

  const value = {
    isAuthenticated,
    login,
    logout,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};