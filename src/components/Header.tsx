import React, { useState } from 'react';
import { Search, Bell, Settings, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SettingsModal from './SettingsModal';

interface HeaderProps {
  toggleMobileMenu?: () => void;
}

export default function Header({ toggleMobileMenu }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      showToast("Logged out successfully!", "info");
    } catch (error) {
      showToast("Logout failed.", "error");
    }
  };

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-16 md:h-20 bg-white flex justify-between items-center px-4 md:px-8 z-30 border-b border-primary/5">
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile menu toggle */}
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors bg-gray-50 rounded-xl"
          aria-label="Toggle mobile menu"
        >
          <Menu size={22} />
        </button>

        {/* Global Search */}
        <div className="bg-surface-container-low focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10 rounded-full px-4 py-2 md:py-2.5 flex items-center gap-2 md:gap-3 w-full max-w-[200px] md:max-w-md border border-transparent transition-all">
          <Search size={18} className="text-on-surface-variant shrink-0" />
          <input 
            id="global-search-input"
            type="text" 
            placeholder="Search..." 
            className="bg-transparent border-none focus:outline-none text-sm w-full placeholder:text-on-surface-variant/70 font-medium text-on-surface"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <div className="flex items-center gap-1 md:gap-4 hidden sm:flex">
          <button className="text-gray-400 hover:text-sidebar transition-colors relative p-2">
            <Bell size={20} className="md:w-[22px] md:h-[22px]" />
            <span className="absolute top-1.5 md:top-2 right-1.5 md:right-2 w-2 h-2 md:w-2.5 md:h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-400 hover:text-sidebar transition-colors p-2"
          >
            <Settings size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
        </div>

        <div className="hidden md:block h-8 w-[1px] bg-gray-100"></div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3 bg-gray-50 px-2 md:px-3 py-1 md:py-1.5 rounded-xl border border-gray-100 cursor-pointer">
            <div className="h-7 w-7 md:h-9 md:w-9 rounded-full bg-sidebar flex items-center justify-center text-white font-bold text-sm md:text-lg shadow-sm">
              N
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs md:text-sm font-bold text-gray-900 leading-tight">Nirman S</p>
              <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                ADMIN
              </p>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block md:w-4 md:h-4" />
          </div>
          
          <button 
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-600 transition-colors p-2"
            title="Logout"
          >
            <LogOut size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
}
