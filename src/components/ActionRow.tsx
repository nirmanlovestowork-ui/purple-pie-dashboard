import React from 'react';
import { Plus, Calendar } from 'lucide-react';

interface ActionRowProps {
  onOrderSuccess?: () => void;
  onScheduleOrder?: () => void;
  onNewOrder?: () => void;
}

export default function ActionRow({ onOrderSuccess, onScheduleOrder, onNewOrder }: ActionRowProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4 md:gap-0">
      <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">{getGreeting()}</h2>
      <div className="flex flex-row items-center gap-3 w-full md:w-auto">
        <button 
          onClick={onScheduleOrder}
          className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-btn-schedule text-sidebar font-bold text-sm rounded-xl shadow-sm hover:opacity-90 transition-opacity"
        >
          <Calendar size={18} />
          <span className="truncate">Schedule</span>
        </button>
        <button 
          onClick={onNewOrder}
          className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-btn-new text-white font-bold text-sm rounded-xl shadow-md hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          <span className="truncate">New Order</span>
        </button>
      </div>
    </div>
  );
}
