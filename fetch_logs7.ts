import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, initializeFirestore, query, orderBy } from 'firebase/firestore';
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);
async function get() {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const recent = [];
  snap.forEach(d => {
    let rawStr = d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000).toISOString() : null;
    if (rawStr && (rawStr.includes('2026-06-20') || rawStr.includes('2026-06-21') || rawStr.includes('2026-06-19') || rawStr.includes('2026-06-18'))) {
       recent.push({
         id: d.id,
         invoice: d.data().invoiceNo,
         date: rawStr,
         amount: d.data().grandTotal,
         customer: d.data().customerName
       });
    }
  });
  console.log(JSON.stringify(recent, null, 2));
  process.exit(0);
}
get();
