import { LayoutDashboard, ShoppingCart, Package, Users, BarChart3, HelpCircle, ClipboardList, Calendar, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect } from 'react';

const navItems = [
  { id: '/', icon: LayoutDashboard, label: 'Home' },
  { id: '/sales', icon: ShoppingCart, label: 'Sales' },
  { id: '/upcoming', icon: Calendar, label: 'Upcoming Orders' },
  { id: '/inventory', icon: Package, label: 'Inventory' },
  { id: '/customers', icon: Users, label: 'Customers' },
  { id: '/reports', icon: BarChart3, label: 'Reports' },
  { id: '/activity', icon: ClipboardList, label: 'Activity Logs' },
];

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (isOpen: boolean) => void;
}

export default function Sidebar({ currentView, onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-sidebar flex flex-col justify-between py-8 z-40 border-r border-transparent transition-transform duration-300 ease-in-out md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Mobile close button */}
        {isMobileMenuOpen && (
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white md:hidden"
            onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        )}
        
        <div>
          <div className="px-8 mb-12 flex flex-col items-center gap-3 mt-4 md:mt-0">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white/20 shadow-lg">
              <img src="/purple pie logo.jpg" alt="The Purple Pie Logo" className="w-full h-full object-cover" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white font-semibold text-center mt-1">Admin Dashboard</p>
          </div>
          
          <nav className="flex flex-col">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex items-center gap-4 px-8 py-4 w-full text-left transition-all duration-200 ease-in-out relative",
                  currentView === item.id 
                    ? "text-accent-gold bg-sidebar-active" 
                    : "text-white/80 hover:bg-sidebar-active/50 hover:text-white"
                )}
              >
                <item.icon size={20} className={cn(
                  "shrink-0 transition-colors duration-200",
                  currentView === item.id ? "text-accent-gold" : "text-white/60"
                )} />
                <span className="text-sm font-bold tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto">
          <button 
            onClick={() => onNavigate('/help')}
            className={cn(
              "flex items-center gap-4 px-8 py-4 w-full text-left transition-all duration-200 ease-in-out",
              currentView === '/help' 
                ? "text-accent-gold bg-sidebar-active" 
                : "text-white/80 hover:bg-sidebar-active/50 hover:text-white"
            )}
          >
            <HelpCircle size={20} className={cn(
              "shrink-0",
              currentView === '/help' ? "text-accent-gold" : "text-white/60"
            )} />
            <span className="text-sm font-bold tracking-wide">Help</span>
          </button>
        </div>
      </aside>
    </>
  );
}
