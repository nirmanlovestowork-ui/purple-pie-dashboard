import { useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDocs, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { useToast } from '../context/ToastContext';

export function useShopifySync() {
  const { showToast } = useToast();

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('source', '==', 'Online')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const order = change.doc.data();
          const orderId = change.doc.id;

          // If already synced, skip
          if (order.inventorySynced) return;

          try {
            const orderRef = doc(db, 'orders', orderId);
            let shouldSync = false;

            // 1. Safely claim the sync task using a transaction
            await runTransaction(db, async (transaction) => {
              const orderSnap = await transaction.get(orderRef);
              if (!orderSnap.exists() || orderSnap.data().inventorySynced) {
                return; // Already synced by another client
              }
              transaction.update(orderRef, { inventorySynced: true });
              shouldSync = true;
            });

            if (!shouldSync) return;

            // 2. Find matching inventory items
            const itemsToUpdate = [];
            for (const item of order.items || []) {
              const invQuery = query(collection(db, 'inventory'), where('name', '==', item.name));
              const invSnap = await getDocs(invQuery);
              
              if (!invSnap.empty) {
                const invDoc = invSnap.docs[0];
                itemsToUpdate.push({
                  ref: doc(db, 'inventory', invDoc.id),
                  qty: item.qty || item.quantity || 1
                });
              }
            }

            // 3. Update inventory
            for (const update of itemsToUpdate) {
              await updateDoc(update.ref, {
                stock: increment(-update.qty)
              });
            }
          } catch (error) {
            console.error('Error syncing Shopify order:', error);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [showToast]);
}
