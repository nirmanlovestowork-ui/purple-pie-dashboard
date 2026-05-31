import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, setPersistence, browserLocalPersistence, User } from 'firebase/auth';
import { auth } from '../firebase';

const ALLOWED_USERS = ["heynirman@gmail.com", "contact.to.tts@gmail.com", "thepurplepie.business@gmail.com"];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAllowed: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    // Set persistence to local
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Error setting persistence:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const email = currentUser.email || '';
        const allowed = ALLOWED_USERS.includes(email);
        
        if (allowed) {
          setUser(currentUser);
          setIsAllowed(true);
        } else {
          // Immediately sign out but keep user state briefly to show restricted screen
          signOut(auth).then(() => {
            setUser(currentUser); // Keep user object to show restricted screen
            setIsAllowed(false);
          });
        }
      } else {
        setUser(null);
        setIsAllowed(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Sign in popup was closed by the user.");
      } else {
        console.error("Error signing in with Google:", error);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAllowed(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAllowed, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
