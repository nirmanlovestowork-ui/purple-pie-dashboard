import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, setPersistence, browserLocalPersistence, User } from 'firebase/auth';
import { auth } from '../firebase';
import { logAudit } from '../lib/firebaseUtils';

const ALLOWED_USERS = ["heynirman@gmail.com", "contact.to.tts@gmail.com", "thepurplepie.business@gmail.com"];

const BYPASS_USER = {
  uid: "bypass-admin-uid",
  email: "thepurplepie.business@gmail.com",
  displayName: "Admin (Bypass)",
} as User;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAllowed: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithCredentials: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    // Check for bypass token first
    if (localStorage.getItem('ttp_bypass') === 'true') {
      setUser(BYPASS_USER);
      setIsAllowed(true);
      setLoading(false);
      return;
    }

    // Set persistence to local
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Error setting persistence:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (localStorage.getItem('ttp_bypass') === 'true') return; // Ignore firebase if bypass active

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
      const result = await signInWithPopup(auth, provider);
      if (result.user && ALLOWED_USERS.includes(result.user.email || '')) {
         await logAudit('USER_LOGIN', `User ${result.user.email} logged in via Google`);
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Sign in popup was closed by the user.");
      } else {
        console.error("Error signing in with Google:", error);
      }
    }
  };

  const signInWithCredentials = async (u: string, p: string) => {
    const normalizedUser = u.trim().toLowerCase();
    if ((normalizedUser === "tpp.bypass" || normalizedUser === "tpp.bypaas") && p.trim() === "TPP.outlet2") {
      localStorage.setItem('ttp_bypass', 'true');
      setUser(BYPASS_USER);
      setIsAllowed(true);
      await logAudit('USER_LOGIN', `User ${BYPASS_USER.email} logged in via bypass`);
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await logAudit('USER_LOGOUT', `User ${user?.email || 'Unknown'} logged out`);
      if (localStorage.getItem('ttp_bypass') === 'true') {
        localStorage.removeItem('ttp_bypass');
        setUser(null);
        setIsAllowed(false);
        return;
      }
      await signOut(auth);
      setUser(null);
      setIsAllowed(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAllowed, signInWithGoogle, signInWithCredentials, logout }}>
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
