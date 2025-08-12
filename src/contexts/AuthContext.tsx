import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

// Define types for Google credential response
interface CredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  sub: string; // Google user ID
}

interface AuthContextType {
  user: GoogleUser | null;
  isLoading: boolean;
  signOut: () => void;
  handleCredentialResponse: (response: CredentialResponse) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Decode JWT token to extract user information
function decodeJWT(token: string): GoogleUser | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decoded = JSON.parse(jsonPayload);
    
    // Check if email domain is allowed
    if (!decoded.email.endsWith('@g.bracu.ac.bd')) {
      throw new Error('Only @g.bracu.ac.bd emails are allowed');
    }
    
    return {
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      sub: decoded.sub,
    };
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing user in localStorage
    const savedUser = localStorage.getItem('bracu-loop-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('bracu-loop-user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleCredentialResponse = (response: CredentialResponse) => {
    const userData = decodeJWT(response.credential);
    
    if (userData) {
      setUser(userData);
      localStorage.setItem('bracu-loop-user', JSON.stringify(userData));
      toast.success(`Welcome back, ${userData.name.split(' ')[0]}!`);
    } else {
      // Show error for non-BRACU email
      toast.error('Access denied! Please use your @g.bracu.ac.bd email to sign in.');
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('bracu-loop-user');
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
    toast.success('Signed out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut, handleCredentialResponse }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Extend the Window interface to include Google
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
