import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot, updateDoc, doc, getDocs, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { cn, formatTimestamp, parseDateTime } from '../lib/utils';
import { Loader2, ShoppingBag, Lock, CheckCircle, MessageCircle, X } from 'lucide-react';
import { handleFirestoreError, OperationType, logActivity } from '../lib/firebaseUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  cakeFlavor?: string;
  weight?: number;
  message?: string;
  totalAmount?: number;
  advancePaid?: number;
  balanceDue?: number;
  createdAt?: any;
  // Fallback for old data structure if any
  invoiceNo?: string;
  items?: { name: string }[];
  grandTotal?: number;
  timestamp?: any;
  paymentMethod?: string;
  isScheduled?: boolean;
  store?: string;
  date?: string;
  time?: string;
}

export default function OrdersTable({ filterToday = false }: { filterToday?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const { isAllowed } = useAuth();
  const isAdmin = isAllowed;
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [orderToComplete, setOrderToComplete] = useState<{ id: string, details: any } | null>(null);

  useEffect(() => {
    if (orderToComplete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [orderToComplete]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterToday]);

  const handleMarkCompleted = async (orderId: string, orderDetails: any) => {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayFormatted = `${dd}/${mm}/${yyyy}`;

      const updateData: any = {
        isScheduled: false,
        date: todayFormatted
      };

      // Map totalAmount to grandTotal if missing
      if (orderDetails.totalAmount !== undefined && orderDetails.grandTotal === undefined) {
        updateData.grandTotal = Number(orderDetails.totalAmount);
      }

      await updateDoc(doc(db, 'orders', orderId), updateData);

      // Decrement inventory for scheduled orders when completed
      if (orderDetails.items && Array.isArray(orderDetails.items)) {
        for (const item of orderDetails.items) {
          // We need to find the inventory item by name since scheduled orders might not have item IDs
          const q = query(collection(db, 'inventory'), where('name', '==', item.name));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const invDoc = snapshot.docs[0];
            const invData = invDoc.data();
            if (invData.maintainStock !== false) {
              const currentStock = invData.stock || 0;
              const newStock = Math.max(0, currentStock - (item.qty || item.quantity || 1));
              await updateDoc(doc(db, 'inventory', invDoc.id), {
                stock: newStock
              });
            }
          }
        }
      }

      await logActivity("Completed", "Admin", orderId);
      showToast("Order marked as completed!", "success");
    } catch (error) {
      console.error("Error marking order as completed:", error);
      showToast("Failed to mark order as completed.", "error");
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setOrders([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'orders')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      
      const todayFormatted1 = `${dd}/${mm}/${yyyy}`;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthAbbr = months[today.getMonth()];
      const todayFormatted2 = `${dd} ${monthAbbr} ${yyyy}`;

      // Filter to only include scheduled orders
      let filteredOrders = ordersData.filter(order => order.isScheduled === true);

      if (filterToday) {
        filteredOrders = filteredOrders.filter(order => {
          return order.date === todayFormatted1 || order.date === todayFormatted2;
        });

        // Sort chronologically by time (e.g., 11:00 AM before 2:00 PM)
        filteredOrders.sort((a, b) => {
          const parseTime = (timeStr?: string) => {
            if (!timeStr) return 0;
            const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/);
            if (timeMatch) {
              let hrs = parseInt(timeMatch[1], 10);
              const mins = parseInt(timeMatch[2], 10);
              const modifier = timeMatch[3]?.toUpperCase();
              if (hrs === 12) hrs = 0;
              if (modifier === 'PM') hrs += 12;
              return hrs * 60 + mins;
            }
            return 0;
          };
          return parseTime(a.time) - parseTime(b.time);
        });
      } else {
        // Sort descending by creation date/time (Sales list logic)
        filteredOrders.sort((a, b) => {
          const getTimestamp = (obj: any) => {
            if (obj.timestamp) {
              if (typeof obj.timestamp.toMillis === 'function') return obj.timestamp.toMillis();
              if (obj.timestamp.seconds) return obj.timestamp.seconds * 1000;
              if (typeof obj.timestamp === 'number') return obj.timestamp;
            }
            if (obj.createdAt) {
              if (typeof obj.createdAt.toMillis === 'function') return obj.createdAt.toMillis();
              if (obj.createdAt.seconds) return obj.createdAt.seconds * 1000;
              if (typeof obj.createdAt === 'number') return obj.createdAt;
            }
            return null;
          };

          const timeA = getTimestamp(a);
          const timeB = getTimestamp(b);

          if (timeA !== null && timeB !== null) {
            return timeB - timeA;
          }

          const parseStringDate = (dateStr?: string, timeStr?: string) => {
            if (!dateStr) return 0;
            if (dateStr.includes('/')) {
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                const [day, month, year] = parts;
                const formattedDate = `${year}/${month}/${day}`;
                const parsed = new Date(`${formattedDate} ${timeStr || ''}`).getTime();
                if (!isNaN(parsed)) return parsed;
              }
            }
            const parsedNative = new Date(`${dateStr} ${timeStr || ''}`).getTime();
            return isNaN(parsedNative) ? 0 : parsedNative;
          };

          const fallbackA = parseStringDate(a.date, a.time);
          const fallbackB = parseStringDate(b.date, b.time);

          return fallbackB - fallbackA;
        });
      }

      setOrders(filteredOrders);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, filterToday]);

  if (!isAdmin && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-surface-container-low text-on-surface-variant/50 rounded-full flex items-center justify-center mb-4">
          <Lock size={32} />
        </div>
        <h5 className="text-sm font-bold text-primary uppercase tracking-widest mb-2">Restricted Data</h5>
        <p className="text-xs text-on-surface-variant max-w-[250px]">
          Only administrators can view the order history. Please login to continue.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">
              <th className="pb-4">Customer</th>
              <th className="pb-4">Products</th>
              <th className="pb-4">Time</th>
              <th className="pb-4">Amount</th>
              <th className="pb-4">Payment</th>
              <th className="pb-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="py-4"><div className="h-8 w-32 skeleton-pulse" /></td>
                <td className="py-4"><div className="h-4 w-40 skeleton-pulse" /></td>
                <td className="py-4"><div className="h-4 w-16 skeleton-pulse" /></td>
                <td className="py-4"><div className="h-4 w-12 skeleton-pulse" /></td>
                <td className="py-4"><div className="h-6 w-16 skeleton-pulse" /></td>
                <td className="py-4 flex justify-end"><div className="h-8 w-24 skeleton-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
          <ShoppingBag size={32} className="text-gray-300" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">No orders recorded yet</h3>
          <p className="text-sm text-gray-500 mt-1">New orders will appear here automatically.</p>
        </div>
      </div>
    );
  }

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = orders.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
            <th className="pb-4 align-middle">Customer</th>
            <th className="pb-4 align-middle">Store</th>
            <th className="pb-4 align-middle">Products</th>
            <th className="pb-4 align-middle">{filterToday ? 'Time' : 'Date & Time'}</th>
            <th className="pb-4 align-middle">Amount</th>
            <th className="pb-4 align-middle">Payment</th>
            <th className="pb-4 text-right align-middle">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {currentItems.map((order, index) => {
            return (
            <tr 
              key={order.id} 
              className="group hover:bg-gray-50 transition-colors"
            >
              <td className="py-4 align-middle max-w-[200px]">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] bg-purple-50 text-brandPurple"
                  )}>
                    {(order.customerName || 'Guest').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-sm font-semibold text-gray-900 truncate w-full">{order.customerName || 'Guest'}</span>
                    {order.customerPhone && (
                      <a
                        href={`https://wa.me/91${order.customerPhone.replace(/[\s\-+]/g, '').replace(/^91/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-1 mt-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-bold transition-colors shrink-0"
                      >
                        <MessageCircle size={12} />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-4 align-middle">
                <span className="text-sm font-bold text-gray-900 border border-gray-200 bg-gray-50 px-2 py-1 rounded">
                  {order.store || 'N/A'}
                </span>
              </td>
              <td className="py-4 text-sm max-w-[200px] truncate align-middle text-gray-700">
                {order.cakeFlavor ? `${order.cakeFlavor} (${order.weight}kg)` : (order.items?.map(i => i.name).join(', ') || 'Custom Order')}
              </td>
              <td className="py-4 text-sm font-mono text-gray-500 align-middle">
                {!filterToday && order.date && (
                  <span className="block text-xs font-bold text-gray-900 mb-0.5">{order.date}</span>
                )}
                {order.time || order.deliveryTime || 'N/A'}
              </td>
              <td className="py-4 text-sm font-bold text-gray-900 align-middle">₹{Number(order.totalAmount || order.grandTotal || 0).toFixed(2)}</td>
              <td className="py-4 align-middle">
                <span className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider",
                  (order.advancePaid && order.advancePaid >= (order.totalAmount || 0)) ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"
                )}>
                  {(order.advancePaid && order.advancePaid >= (order.totalAmount || 0)) ? 'PAID' : 'PENDING'}
                </span>
              </td>
              <td className="py-4 text-right align-middle">
                <button
                  onClick={() => setOrderToComplete({ id: order.id, details: order })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-sm rounded text-xs font-bold uppercase transition-all"
                >
                  <CheckCircle size={14} className="text-green-600" />
                  Complete
                </button>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
      
      {!loading && orders.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest mt-4">
          <div className="text-sm text-on-surface-variant">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, orders.length)} of {orders.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-bold border border-outline-variant/20 rounded-md hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(orders.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(orders.length / itemsPerPage)}
              className="px-3 py-1 text-sm font-bold border border-outline-variant/20 rounded-md hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {orderToComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrderToComplete(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-surface rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-outline-variant/20"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Complete Order?</h3>
                  <p className="text-sm text-on-surface-variant mb-6">
                    Are you sure you want to mark this order as completed? This action will decrement inventory stock according to the order items.
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={async () => {
                        await handleMarkCompleted(orderToComplete.id, orderToComplete.details);
                        setOrderToComplete(null);
                      }}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
                    >
                      Yes, Mark Completed
                    </button>
                    <button
                      onClick={() => setOrderToComplete(null)}
                      className="w-full py-3 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
