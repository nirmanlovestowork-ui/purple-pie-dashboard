import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId);

async function fetchLogs() {
  try {
    console.log("Fetching from auditlogs...");
    const auditSnapshot = await getDocs(collection(db, 'auditlogs'));
    auditSnapshot.forEach(doc => {
      const data = doc.data();
      if(data.event === 'ORDER_DELETED' || data.event === 'ITEM_DELETED' || data.actionType === 'ORDER_DELETED') {
        console.log("auditlogs DOC:", doc.id, data);
      }
    });
  } catch (e) {
    console.error("auditlogs Error:", e.message);
  }

  try {
    console.log("Fetching from activityLogs...");
    const activitySnapshot = await getDocs(collection(db, 'activityLogs'));
    activitySnapshot.forEach(doc => {
      const data = doc.data();
      if(data.event === 'ORDER_DELETED' || data.event === 'ITEM_DELETED' || data.actionType === 'ORDER_DELETED') {
        console.log("activityLogs DOC:", doc.id, data);
      }
    });
  } catch (e) {
    console.error("activityLogs Error:", e.message);
  }

  process.exit(0);
}

fetchLogs();
