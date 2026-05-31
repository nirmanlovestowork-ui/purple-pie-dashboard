import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChevronDown, Loader2 } from 'lucide-react';

interface Order {
  id: string;
  date?: string;
  totalAmount?: number;
  grandTotal?: number;
  isScheduled?: boolean;
}

interface InventoryItem {
  id: string;
  name: string;
  stock?: number;
  maintainStock?: boolean;
}

export default function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoadingOrders(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoadingOrders(false);
    });

    const qInventory = query(collection(db, 'inventory'));
    const unsubscribeInventory = onSnapshot(qInventory, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(inventoryData);
      setLoadingInventory(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
      setLoadingInventory(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeInventory();
    };
  }, []);

  // Generate last 7 days array in DD/MM/YYYY format
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      days.push(`${dd}/${mm}/${yyyy}`);
    }
    return days;
  }, []);

  // Process revenue data
  const revenueData = useMemo(() => {
    const realizedOrders = orders.filter(o => o.isScheduled === false || o.isScheduled === undefined);
    
    return last7Days.map(dateStr => {
      const dayOrders = realizedOrders.filter(o => o.date === dateStr);
      const sum = dayOrders.reduce((acc, curr) => acc + (curr.grandTotal || curr.totalAmount || 0), 0);
      
      // For display, show DD/MM
      const displayDate = dateStr.substring(0, 5);
      
      return {
        date: dateStr,
        displayDate,
        revenue: sum
      };
    });
  }, [orders, last7Days]);

  // Process low stock alerts
  const lowStockItems = useMemo(() => {
    return inventory.filter(item => item.maintainStock !== false && item.stock !== undefined && item.stock < 10);
  }, [inventory]);

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-slate-50 -mx-4 md:-mx-10 -mt-8 px-4 md:px-10 pt-8 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-serif italic text-gray-900 tracking-tight">At a glance...</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 1: 7-Day Revenue Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">7-Day Revenue Trend</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              <span>Last 7 days</span>
              <ChevronDown size={16} />
            </div>
          </div>
          
          <div className="w-full">
            {loadingOrders ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value}`}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₹${value}`, 'Revenue']}
                    labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#7D007D" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#d97706', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#d97706', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Widget 2: Low Stock Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 p-6 lg:col-span-1 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Low Stock Alerts</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              <span>Current</span>
              <ChevronDown size={16} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {loadingInventory ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400 text-sm italic">All stock levels healthy.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                    <span className="text-gray-800 font-medium text-sm">{item.name}</span>
                    <span className="text-red-500 font-bold text-sm">{item.stock} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
