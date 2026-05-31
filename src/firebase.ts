import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the named database that was successfully provisioned
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)'); 

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'metadata', 'connection-test'));
  } catch (error) {
    console.error("Firestore connection test error:", error);
  }
}

testConnection();
