import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId);

async function fetchLogs() {
  try {
       const snapshot = await getDocs(collection(db, 'activity_logs'));
       snapshot.forEach(doc => {
         const data = doc.data();
         const seconds = data.timestamp?.seconds;
         const d = new Date(seconds * 1000);
         console.log(`[activity_logs] ${doc.id}: ${d.toISOString()} | Event: ${data.actionType} | Desc: ${data.description}`);
       });
  } catch (e) {
       console.log(`Error reading activity_logs: ${e.message}`);
  }
  process.exit(0);
}

fetchLogs();
