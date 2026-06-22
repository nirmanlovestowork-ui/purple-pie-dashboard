import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId);

async function checkAll() {
  const allColl = ['orders', 'inventory', 'sales', 'users', 'metadata', 'auditlogs', 'activityLogs', 'activity_logs', 'customers'];
  for (const c of allColl) {
    try {
       const snapshot = await getDocs(collection(db, c));
       console.log(`Collection ${c} has ${snapshot.size} documents.`);
    } catch (e) {
       console.log(`Error reading ${c}: ${e.message}`);
    }
  }
  process.exit(0);
}

checkAll();
