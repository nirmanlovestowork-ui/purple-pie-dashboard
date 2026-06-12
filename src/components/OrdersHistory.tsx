import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, getDocs, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { cn, formatTimestamp, parseDateTime } from '../lib/utils';
import { Loader2, ShoppingBag, Lock, Search, Eye, X, Calendar, User, Hash, IndianRupee, CreditCard, MoreVertical, Edit, Trash2, Filter, CheckCircle, Download, MessageCircle } from 'lucide-react';
import { handleFirestoreError, OperationType, logActivity } from '../lib/firebaseUtils';
import { motion, AnimatePresence } from 'motion/react';
import BluetoothPrinterButton from './BluetoothPrinterButton';
import NewOrderModal from './NewOrderModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { generateInvoice } from '../utils/pdfGenerator';

interface OrderItem {
  name: string;
  qty: number;
  quantity?: number;
  price: number;
  subtotal: number;
}

interface Order {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  totalAmount?: number;
  paymentMethod: string;
  timestamp: any;
  date?: string;
  time?: string;
  source?: string;
  isScheduled?: boolean;
  store?: string;
  address?: {
    apt?: string;
    street?: string;
    city?: string;
    state?: string;
    pin?: string;
  };
}

export default function OrdersHistory() {
  const { showToast } = useToast();
  const { isAllowed } = useAuth();
  const isAdmin = isAllowed;
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');
  const [filterStore, setFilterStore] = useState('All');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate, filterSource, filterPayment, filterStore]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

const confirmDelete = async () => {
    if (!orderToDelete) return;
    const documentId = orderToDelete.id || orderToDelete.invoiceNo;
    
    try {
      await deleteDoc(doc(db, "orders", documentId));
      showToast("Order deleted successfully!", "success");
      setOrderToDelete(null); // Close modal on success
    } catch (error) {
      showToast("Failed to delete order.", "error");
    }
  };

  const handleEdit = (order: Order) => {
    setOrderToEdit(order);
    setEditModalOpen(true);
    setOpenDropdownId(null);
  };

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
      setOpenDropdownId(null);
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
      
      ordersData.sort((a, b) => {
        // Primary Method: Firebase timestamp
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

        // Fallback Method: String Parsing
        const parseStringDate = (dateStr?: string, timeStr?: string) => {
          if (!dateStr) return 0;
          
          // Handle DD/MM/YYYY format
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              const [day, month, year] = parts;
              const formattedDate = `${year}/${month}/${day}`;
              const parsed = new Date(`${formattedDate} ${timeStr || ''}`).getTime();
              if (!isNaN(parsed)) return parsed;
            }
          }
          
          // Handle DD MMM YYYY format (or other native formats)
          const parsedNative = new Date(`${dateStr} ${timeStr || ''}`).getTime();
          return isNaN(parsedNative) ? 0 : parsedNative;
        };

        const fallbackA = parseStringDate(a.date, a.time);
        const fallbackB = parseStringDate(b.date, b.time);

        return fallbackB - fallbackA;
      });

      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const isDateMatch = (orderDateStr: string | undefined, filter: string) => {
    if (filter === 'All') return true;
    if (!orderDateStr) return false;

    const parts = orderDateStr.split('/');
    if (parts.length !== 3) return false;
    const [day, month, year] = parts.map(Number);
    const orderDate = new Date(year, month - 1, day);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    if (filter === 'Today') {
      return orderDate.getTime() === today.getTime();
    } else if (filter === 'Yesterday') {
      return orderDate.getTime() === yesterday.getTime();
    } else if (filter === 'This Week') {
      return orderDate >= startOfWeek && orderDate <= today;
    }
    return true;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = debouncedSearchTerm === '' || 
      (order.customerName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (order.invoiceNo || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    const matchesDate = isDateMatch(order.date, filterDate);
    const matchesSource = filterSource === 'All' || (order.source || 'Offline').toUpperCase() === filterSource;
    const matchesPayment = filterPayment === 'All' || (order.paymentMethod || 'CASH').toUpperCase() === filterPayment;
    const matchesStore = filterStore === 'All' || (order.store || 'BRAHMESWARPATNA').toUpperCase() === filterStore.toUpperCase();

    return matchesSearch && matchesDate && matchesSource && matchesPayment && matchesStore;
  });

  const cleanupDatabase = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    try {
      let deletedCount = 0;
      for (const order of orders) {
        // Random Firestore IDs are typically 20 characters long and alphanumeric
        // Our custom IDs start with 'TPP-'
        if (order.id && !order.id.startsWith('TPP-')) {
          await deleteDoc(doc(db, "orders", order.id));
          deletedCount++;
        }
      }
      showToast(`Successfully deleted ${deletedCount} invalid orders.`, "success");
    } catch (error) {
      showToast("Failed to cleanup database.", "error");
    } finally {
      setIsCleaning(false);
    }
  };

  const exportToCSV = async () => {
    if (isExporting) return;
    if (filteredOrders.length === 0) {
      showToast("No orders to export", "error");
      return;
    }
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 400)); // UX delay

    const headers = ["Date", "Time", "Invoice No", "Customer Name", "Phone", "Store", "Subtotal", "Discount", "Grand Total", "Payment Method", "Source", "Status"];
    
    const csvRows = [
      headers.join(','),
      ...filteredOrders.map(order => {
        const status = order.isScheduled ? "Scheduled" : "Completed";
        const row = [
          order.date || '',
          order.time || '',
          order.invoiceNo || '',
          `"${(order.customerName || '').replace(/"/g, '""')}"`,
          order.customerPhone || '',
          order.store || 'N/A',
          order.subtotal || 0,
          order.discount || 0,
          order.grandTotal || 0,
          order.paymentMethod || 'CASH',
          order.source || 'Offline',
          status
        ];
        return row.join(',');
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAdmin && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-surface-container-low text-on-surface-variant/50 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} />
        </div>
        <h2 className="text-xl font-bold text-primary uppercase tracking-widest mb-3">Restricted Access</h2>
        <p className="text-on-surface-variant max-w-md">
          The order history is only accessible to authorized administrators. Please log in with an admin account to view this data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 xl:gap-0">
        <div>
          <h2 className="text-2xl font-extrabold font-headline text-primary tracking-tight">Order History</h2>
          <p className="text-on-surface-variant text-sm font-medium">Manage and track all sales records</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search by customer or invoice..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brandPurple/20 w-full shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={exportToCSV}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button
            onClick={cleanupDatabase}
            disabled={isCleaning}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Cleanup invalid orders"
          >
            {isCleaning ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-low/30 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em]">
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Items Summary</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-8 w-24 skeleton-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 skeleton-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-10 w-32 skeleton-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-40 skeleton-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 skeleton-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-12 skeleton-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-8 skeleton-pulse mx-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
              <ShoppingBag size={32} className="text-gray-300" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">No orders found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4 align-middle">Date & Time</th>
                  <th className="px-6 py-4 align-middle">Invoice #</th>
                  <th className="px-6 py-4 align-middle">Customer</th>
                  <th className="px-6 py-4 align-middle">Store</th>
                  <th className="px-6 py-4 align-middle">Source</th>
                  <th className="px-6 py-4 align-middle">Payment</th>
                  <th className="px-6 py-4 align-middle">Total Amount</th>
                  <th className="px-6 py-4 text-center align-middle">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
                  
                  return currentItems.map((order, index) => {
                    const orderDate = parseDateTime(order.date, order.time, order.timestamp);
                    return (
                    <tr 
                      key={order.id} 
                      className="group hover:bg-gray-50 transition-colors"
                    >
                    <td className="px-6 py-4 align-middle">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">
                          {orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle max-w-[120px]">
                      <span className="text-xs font-mono font-bold text-brandPurple bg-purple-50 px-2.5 py-1 rounded border border-purple-100 truncate block">
                        {order.invoiceNo || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle max-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                          {(order.customerName || 'Guest').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex flex-col items-start overflow-hidden">
                          <span className="text-sm font-bold text-gray-900 truncate w-full">{order.customerName || 'Guest'}</span>
                          <span className="text-[10px] text-gray-500 truncate w-full">{order.customerPhone || 'N/A'}</span>
                          {order.customerPhone && (
                            <a
                              href={`https://wa.me/91${order.customerPhone.replace(/[\s\-+]/g, '').replace(/^91/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-1 mt-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-bold transition-colors"
                            >
                              <MessageCircle size={12} />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider bg-gray-100 text-gray-700">
                        {order.store || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider",
                        order.source === 'Online' ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {order.source || 'Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider",
                        order.paymentMethod === 'CASH' ? "bg-green-50 text-green-700" : "bg-purple-50 text-brandPurple"
                      )}>
                        {order.paymentMethod || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className="text-sm font-extrabold text-gray-900">₹{Number(order.grandTotal || order.totalAmount || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-center relative align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <div className="relative">
                          <button 
                            onClick={() => setOpenDropdownId(openDropdownId === order.id ? null : order.id)}
                            className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition-colors"
                            title="More Actions"
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          <AnimatePresence>
                            {openDropdownId === order.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-outline-variant/20 z-50 overflow-hidden"
                                ref={dropdownRef}
                              >
                                <div className="py-1">
                                  {order.isScheduled && (
                                    <button
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleMarkCompleted(order.id, order);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 font-medium"
                                    >
                                      <CheckCircle size={14} />
                                      Mark as Completed
                                    </button>
                                  )}
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      generateInvoice(order);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-medium"
                                  >
                                    <Download size={14} />
                                    Download PDF
                                  </button>
                                  <BluetoothPrinterButton order={order} variant="dropdown" />
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedOrder(order);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2"
                                  >
                                    <Eye size={14} />
                                    View
                                  </button>
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleEdit(order);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2"
                                  >
                                    <Edit size={14} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOrderToDelete(order); // Opens the modal
                                      setOpenDropdownId(null); // Closes the dropdown
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            
            {!loading && filteredOrders.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest">
                <div className="text-sm text-on-surface-variant">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} results
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
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredOrders.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(filteredOrders.length / itemsPerPage)}
                    className="px-3 py-1 text-sm font-bold border border-outline-variant/20 rounded-md hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ willChange: "transform, opacity" }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 bg-primary text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold font-headline">Order Details</h3>
                  <p className="text-white/70 text-xs mt-1">Invoice: {selectedOrder.invoiceNo}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-surface-container-low rounded-lg text-primary">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Customer</p>
                        <p className="text-sm font-bold">{selectedOrder.customerName || 'Guest'}</p>
                        <p className="text-xs text-on-surface-variant">{selectedOrder.customerPhone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-surface-container-low rounded-lg text-primary">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Date & Time</p>
                        <p className="text-sm font-bold">
                          {parseDateTime(selectedOrder.date, selectedOrder.time, selectedOrder.timestamp).toLocaleString('en-IN', { 
                            day: '2-digit', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-surface-container-low rounded-lg text-primary">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Payment Method</p>
                        <p className="text-sm font-bold">{selectedOrder.paymentMethod || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-surface-container-low rounded-lg text-primary">
                        <Hash size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Source</p>
                        <p className="text-sm font-bold">{selectedOrder.source || 'Offline'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-surface-container-low rounded-lg text-primary">
                        <ShoppingBag size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Store</p>
                        <p className="text-sm font-bold">{selectedOrder.store || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address (If available) */}
                {selectedOrder.address && Object.keys(selectedOrder.address).length > 0 && (
                  <div className="bg-surface-container-low/30 p-4 rounded-xl border border-outline-variant/10">
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Delivery Address</h4>
                    <p className="text-sm font-medium text-on-surface">
                      {[
                        selectedOrder.address.apt,
                        selectedOrder.address.street,
                        selectedOrder.address.city,
                        selectedOrder.address.state,
                        selectedOrder.address.pin
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}

                {/* Items Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-outline-variant/10 pb-2">Itemized Breakdown</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => {
                      const qty = item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 1);
                      return (
                      <div key={idx} className="flex justify-between items-center py-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{item.name}</span>
                          <span className="text-[10px] text-on-surface-variant">₹{item.price} x {qty}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">₹{Number(item.subtotal || (item.price * qty) || 0).toFixed(2)}</span>
                      </div>
                    )})}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-surface-container-low p-6 rounded-2xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span className="font-bold">₹{Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Discount</span>
                    <span className="font-bold text-emerald-600">- ₹{Number(selectedOrder.discount || 0).toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center">
                    <span className="text-lg font-bold text-primary">Grand Total</span>
                    <span className="text-2xl font-extrabold text-primary font-headline">₹{Number(selectedOrder.grandTotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-surface-container-low border-t border-outline-variant/10">
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <BluetoothPrinterButton order={selectedOrder} />
                  </div>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 btn-smooth"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <NewOrderModal 
        isOpen={editModalOpen} 
        onClose={() => {
          setEditModalOpen(false);
          setOrderToEdit(null);
        }} 
        onSuccess={() => {
          showToast("Order updated successfully!", "success");
          setEditModalOpen(false);
          setOrderToEdit(null);
        }}
        editMode={true}
        initialData={orderToEdit}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6"
            >
              <div className="flex items-center gap-4 text-red-600 mb-4">
                <div className="p-3 bg-red-50 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold font-headline">Delete Order</h3>
              </div>
              
              <p className="text-on-surface-variant mb-8">
                Are you sure you want to delete order <span className="font-bold text-on-surface">{orderToDelete.invoiceNo || orderToDelete.id}</span>? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setOrderToDelete(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-5 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Filter Slide-Out Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <div className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="absolute inset-0"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[999] w-80 bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-xl font-bold font-headline text-primary flex items-center gap-2">
                  <Filter size={20} />
                  Filters
                </h3>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-8">
                {/* Date Filter */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Date</label>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Today', 'Yesterday', 'This Week'].map(option => (
                      <button
                        key={option}
                        onClick={() => setFilterDate(option)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-bold transition-colors",
                          filterDate === option 
                            ? "bg-primary text-white" 
                            : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source Filter */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Source</label>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="All">All Sources</option>
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>

                {/* Payment Filter */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Payment Method</label>
                  <select
                    value={filterPayment}
                    onChange={(e) => setFilterPayment(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="All">All Methods</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="PREPAID">Prepaid</option>
                    <option value="CASH ON DELIVERY">Cash on Delivery</option>
                  </select>
                </div>

                {/* Store Filter */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Store</label>
                  <select
                    value={filterStore}
                    onChange={(e) => setFilterStore(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="All">All Stores</option>
                    <option value="BRAHMESWARPATNA">BRAHMESWARPATNA</option>
                    <option value="BYPASS FOOD COURT">BYPASS FOOD COURT</option>
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-outline-variant/10 bg-surface-container-low/30 flex gap-3">
                <button 
                  onClick={() => {
                    setFilterDate('All');
                    setFilterSource('All');
                    setFilterPayment('All');
                  }}
                  className="flex-1 py-3 bg-white border border-outline-variant/20 text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-low transition-colors"
                >
                  Reset
                </button>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
