import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signUp: (userData: Omit<User, 'id'> & { password: string }) => Promise<{ success: boolean; message: string }>;
  signOut: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already signed in on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('agriSakhaUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('agriSakhaUser');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Get stored users
      const storedUsers = localStorage.getItem('agriSakhaUsers');
      if (!storedUsers) {
        return { success: false, message: 'No users found. Please sign up first.' };
      }

      const users: User[] = JSON.parse(storedUsers);
      const user = users.find(u => u.email === email);

      if (!user) {
        return { success: false, message: 'User not found. Please check your email or sign up.' };
      }

      // In a real app, you'd hash and compare passwords
      // For now, we'll store a simple password hash (this is NOT secure for production)
      const storedPasswordHash = localStorage.getItem(`agriSakhaPassword_${user.id}`);
      if (storedPasswordHash !== password) {
        return { success: false, message: 'Invalid password. Please try again.' };
      }

      // Set user as authenticated
      setUser(user);
      localStorage.setItem('agriSakhaUser', JSON.stringify(user));
      
      return { success: true, message: 'Successfully signed in!' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, message: 'An error occurred during sign in.' };
    }
  };

  const signUp = async (userData: Omit<User, 'id'> & { password: string }): Promise<{ success: boolean; message: string }> => {
    try {
      const { password, ...userInfo } = userData;
      
      // Check if user already exists
      const storedUsers = localStorage.getItem('agriSakhaUsers');
      const users: User[] = storedUsers ? JSON.parse(storedUsers) : [];
      
      const existingUser = users.find(u => u.email === userInfo.email);
      if (existingUser) {
        return { success: false, message: 'User with this email already exists. Please sign in instead.' };
      }

      // Create new user
      const newUser: User = {
        ...userInfo,
        id: Date.now().toString(), // Simple ID generation
      };

      // Store user data
      users.push(newUser);
      localStorage.setItem('agriSakhaUsers', JSON.stringify(users));
      
      // Store password (in production, this should be hashed and stored securely)
      localStorage.setItem(`agriSakhaPassword_${newUser.id}`, password);

      // Set user as authenticated
      setUser(newUser);
      localStorage.setItem('agriSakhaUser', JSON.stringify(newUser));
      
      return { success: true, message: 'Account created successfully!' };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, message: 'An error occurred during sign up.' };
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('agriSakhaUser');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
