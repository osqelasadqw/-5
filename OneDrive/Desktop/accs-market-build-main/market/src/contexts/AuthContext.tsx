import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { 
  subscribeToAuthChanges, 
  loginUser, 
  registerUser, 
  logoutUser,
  loginWithGoogle,
  LoginData,
  RegisterData,
  getCurrentUserData
} from '@/services/authService';
import { initUserChats } from '@/services/realtimeChatService';

interface AuthContextType {
  currentUser: User | null;
  userData: any | null;
  isLoading: boolean;
  login: (data: LoginData) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setCurrentUser(user);
      
      // If user is logged in, get their user data from Firestore
      if (user) {
        try {
          const data = await getCurrentUserData(user);
          setUserData(data);
          
          // Initialize realtime chat data
          await initUserChats();
        } catch (error) {
          console.error("Error getting user data:", error);
        }
      } else {
        setUserData(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (data: LoginData) => {
    try {
      const user = await loginUser(data);
      toast.success("Logged in successfully!");
      return user;
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const user = await registerUser(data);
      toast.success("Registration successful!");
      return user;
    } catch (error: any) {
      toast.error(error.message || "Failed to register");
      throw error;
    }
  };

  const googleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      toast.success("Logged in with Google successfully!");
      return user;
    } catch (error: any) {
      toast.error(error.message || "Failed to login with Google");
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
      toast.success("Logged out successfully!");
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to logout");
      throw error;
    }
  };

  const value = {
    currentUser,
    userData,
    isLoading,
    login,
    register,
    loginWithGoogle: googleLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
