import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ActionRow from './components/ActionRow';
import OrdersTable from './components/OrdersTable';
import TrendingProducts from './components/TrendingProducts';
import InventoryManagement from './components/InventoryManagement';
import OrdersHistory from './components/OrdersHistory';
import Reports from './components/Reports';
import Customers from './components/Customers';
import ActivityLogs from './components/ActivityLogs';
import UpcomingOrders from './components/UpcomingOrders';
import ScheduledOrderModal from './components/ScheduledOrderModal';
import NewOrderModal from './components/NewOrderModal';
import { ShoppingBag, TrendingUp, Lock, Loader2, BarChart3, Calendar } from 'lucide-react';
import { db } from './firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firebaseUtils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useShopifySync } from './hooks/useShopifySync';

import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import RestrictedAccessPage from './components/RestrictedAccessPage';

function DashboardHome({ orders, todayStats, isAdmin, showToast, setIsScheduledModalOpen, setIsNewOrderModalOpen }: any) {
  return (
    <>
      <ActionRow 
        onOrderSuccess={() => showToast("Order recorded successfully!", "success")} 
        onScheduleOrder={() => setIsScheduledModalOpen(true)}
        onNewOrder={() => setIsNewOrderModalOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Card 1: Today's Revenue */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-center gap-4">
          <div className="p-3 bg-sidebar/5 rounded-xl text-sidebar">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Today's Revenue</h4>
            <p className="text-2xl font-bold text-gray-900">₹{todayStats.revenue % 1 !== 0 ? todayStats.revenue.toFixed(2) : todayStats.revenue}</p>
          </div>
        </div>

        {/* Card 2: Today's Orders */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-accent-gold">
            <TrendingUp size={24} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Today's Orders</h4>
            <p className="text-2xl font-bold text-gray-900">{todayStats.orders}</p>
          </div>
        </div>

        {/* Card 3: Top Sellers */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col min-h-[140px]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Top Sellers</h4>
            <BarChart3 size={16} className="text-gray-300" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
             <TrendingProducts compact={true} />
          </div>
        </div>
      </div>

      {/* Detailed Sections below */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 mt-6 md:mt-8">
        <div className="md:col-span-8">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
            <h4 className="font-headline text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Upcoming Orders</h4>
            <OrdersTable filterToday={true} />
          </div>
        </div>
        <div className="md:col-span-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] h-full overflow-hidden">
            <h4 className="font-headline text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Inventory Status</h4>
            <InventoryManagement compact={true} />
          </div>
        </div>
      </div>
    </>
  );
}

function AppContent() {
  useShopifySync();

  const navigate = useNavigate();
  const location = useLocation();
  const [isScheduledModalOpen, setIsScheduledModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const { user, loading, isAllowed } = useAuth();
  
  // Only the allowed users are admins in this context
  const isAdmin = isAllowed;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K or Meta + K: Focus Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Alt + N: Open New Order Modal
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewOrderModalOpen(true);
      }

      // Alt + S: Open Scheduled Order Modal
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsScheduledModalOpen(true);
      }

      // Alt + I: Open Add Item Modal
      if (e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsAddItemModalOpen(true);
      }

      // Escape: Close Modals
      if (e.key === 'Escape') {
        setIsNewOrderModalOpen(false);
        setIsScheduledModalOpen(false);
        setIsAddItemModalOpen(false);
      }

      // Navigation Shortcuts
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        navigate('/');
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        navigate('/sales');
      }
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        navigate('/upcoming');
      }
      if (e.altKey && e.key === '4') {
        e.preventDefault();
        navigate('/inventory');
      }
      if (e.altKey && e.key === '5') {
        e.preventDefault();
        navigate('/customers');
      }
      if (e.altKey && e.key === '6') {
        e.preventDefault();
        navigate('/reports');
      }
      if (e.altKey && e.key === '7') {
        e.preventDefault();
        navigate('/activity');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin) {
      setOrders([]);
      return;
    }

    const q = query(collection(db, 'orders'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const todayStats = React.useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    // Format 1: DD/MM/YYYY
    const todayFormatted1 = `${dd}/${mm}/${yyyy}`;
    
    // Format 2: DD MMM YYYY
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthAbbr = months[today.getMonth()];
    const todayFormatted2 = `${dd} ${monthAbbr} ${yyyy}`;

    const todaysOrders = orders.filter(order => {
      if (order.isScheduled) return false;
      return order.date === todayFormatted1 || order.date === todayFormatted2;
    });

    const todaysOrderCount = todaysOrders.length;
    const todaysRevenue = todaysOrders.reduce((sum, order) => sum + Number(order.grandTotal || order.totalAmount || 0), 0);

    return {
      revenue: todaysRevenue,
      orders: todaysOrderCount
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A148C]" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!isAllowed) {
    return <RestrictedAccessPage />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar 
        currentView={location.pathname} 
        onNavigate={(path) => {
          navigate(path);
          setIsMobileMenuOpen(false);
        }} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <Header toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      
      <main className="md:ml-64 pt-20 md:pt-24 px-4 md:px-8 pb-12 overflow-y-auto">
        <ErrorBoundary>
          <div className="max-w-7xl mx-auto">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: "linear" }}
              style={{ willChange: "opacity" }}
            >
              <Routes>
                <Route path="/" element={<DashboardHome orders={orders} todayStats={todayStats} isAdmin={isAdmin} showToast={showToast} setIsScheduledModalOpen={setIsScheduledModalOpen} setIsNewOrderModalOpen={setIsNewOrderModalOpen} />} />
                <Route path="/sales" element={<OrdersHistory />} />
                <Route path="/upcoming" element={<UpcomingOrders />} />
                <Route path="/inventory" element={<InventoryManagement isAddItemModalOpen={isAddItemModalOpen} setIsAddItemModalOpen={setIsAddItemModalOpen} />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/activity" element={<ActivityLogs />} />
              </Routes>
            </motion.div>
          </div>
        </ErrorBoundary>
      </main>

      <ScheduledOrderModal 
        isOpen={isScheduledModalOpen} 
        onClose={() => setIsScheduledModalOpen(false)} 
      />
      <NewOrderModal 
        isOpen={isNewOrderModalOpen} 
        onClose={() => setIsNewOrderModalOpen(false)} 
        onSuccess={() => showToast("Order recorded successfully!", "success")}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
