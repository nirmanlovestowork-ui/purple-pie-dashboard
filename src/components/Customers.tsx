import React, { useState, useEffect, useMemo } from 'react';
import { Search, Lock, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { useAuth } from '../context/AuthContext';

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  date: string;
  timestamp?: any;
}

interface CustomerAggregated {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  lastOrderTimestamp: number;
}

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAllowed } = useAuth();
  const isAdmin = isAllowed;
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (!isAdmin) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'orders'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const parseDateToTimestamp = (dateStr: string, fbTimestamp?: any) => {
    if (fbTimestamp?.toMillis) {
      return fbTimestamp.toMillis();
    }
    if (!dateStr) return 0;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    }
    return new Date(dateStr).getTime();
  };

  const aggregatedCustomers = useMemo(() => {
    const customerMap = new Map<string, CustomerAggregated>();

    orders.forEach(order => {
      const name = (order.customerName || 'Unknown').trim();
      const phone = (order.customerPhone || 'N/A').trim();
      const key = `${name.toLowerCase()}-${phone.toLowerCase()}`;
      const orderTimestamp = parseDateToTimestamp(order.date, order.timestamp);

      if (customerMap.has(key)) {
        const existing = customerMap.get(key)!;
        existing.totalOrders += 1;
        existing.totalSpent += (order.grandTotal || 0);
        if (orderTimestamp > existing.lastOrderTimestamp) {
          existing.lastOrderTimestamp = orderTimestamp;
          existing.lastOrderDate = order.date || existing.lastOrderDate;
        }
      } else {
        customerMap.set(key, {
          id: key,
          name,
          phone,
          totalOrders: 1,
          totalSpent: order.grandTotal || 0,
          lastOrderDate: order.date || 'N/A',
          lastOrderTimestamp: orderTimestamp
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.lastOrderTimestamp - a.lastOrderTimestamp);
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    return aggregatedCustomers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [aggregatedCustomers, searchTerm]);

  if (!isAdmin && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-surface-container-low text-on-surface-variant/50 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} />
        </div>
        <h2 className="text-xl font-bold text-primary uppercase tracking-widest mb-3">Restricted Access</h2>
        <p className="text-on-surface-variant max-w-md mx-auto">
          You need administrator privileges to view customer data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h2 className="text-2xl font-extrabold font-headline text-primary tracking-tight">Customers</h2>
          <p className="text-on-surface-variant text-sm font-medium">Manage customer relationships</p>
        </div>

        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={18} />
          <input 
            type="text"
            placeholder="Search by name or phone..."
            className="pl-10 pr-4 py-2 bg-white border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 w-full sm:w-80 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-surface-container-low/30 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em]">
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Total Orders</th>
                  <th className="px-6 py-4">Total Spent</th>
                  <th className="px-6 py-4">Last Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const indexOfLastItem = currentPage * itemsPerPage;
                    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                    const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
                    
                    return currentItems.map((customer) => (
                      <tr key={customer.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-on-surface">{customer.name}</div>
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">{customer.phone}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brandPurple/10 text-brandPurple">
                            {customer.totalOrders} {customer.totalOrders === 1 ? 'Order' : 'Orders'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-on-surface">₹{customer.totalSpent.toLocaleString()}</td>
                        <td className="px-6 py-4 text-on-surface-variant text-sm">{customer.lastOrderDate}</td>
                      </tr>
                    ));
                  })()
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && filteredCustomers.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest">
            <div className="text-sm text-on-surface-variant">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} results
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredCustomers.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredCustomers.length / itemsPerPage)}
                className="px-3 py-1 text-sm font-bold border border-outline-variant/20 rounded-md hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
