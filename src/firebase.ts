import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the named database that was successfully provisioned
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId); 

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'metadata', 'connection-test'));
  } catch (error) {
    console.error("Firestore connection test error:", error);
  }
}

testConnection();
