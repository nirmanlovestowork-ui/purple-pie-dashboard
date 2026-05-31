import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

export default function RestrictedAccessPage() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[12px] shadow-sm border border-red-100 max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3 font-headline">Access Restricted</h1>
        <p className="text-gray-600 mb-2">
          The email <span className="font-semibold text-gray-900">{user?.email}</span> is not authorized to access the Purple Pie Admin Dashboard.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Please contact the administrator if you believe this is a mistake.
        </p>
        
        <button 
          onClick={logout}
          className="w-full bg-[#4A148C] text-white px-6 py-3 rounded-[12px] font-medium hover:bg-[#3A0F6C] transition-colors shadow-sm"
        >
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}
