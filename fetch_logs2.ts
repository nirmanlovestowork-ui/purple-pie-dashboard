import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId);

async function fetchLogs() {
  const collectionsToTry = ['auditlogs', 'activityLogs', 'activity_logs', 'orders', 'inventory'];
  
  for (const coll of collectionsToTry) {
     try {
       console.log(`\n--- Fetching from ${coll} ---`);
       const snapshot = await getDocs(collection(db, coll));
       snapshot.forEach(doc => {
         const data = doc.data();
         const jsonStr = JSON.stringify(data);
         if (jsonStr.toLowerCase().includes('delete') || jsonStr.toLowerCase().includes('remove')) {
            console.log(`[${coll}] ${doc.id}:`, data);
         }
       });
     } catch (e) {
       console.log(`Error reading ${coll}: ${e.message}`);
     }
  }

  process.exit(0);
}

fetchLogs();
