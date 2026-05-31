import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { formatTimestamp, cn } from '../lib/utils';
import { Loader2, Filter } from 'lucide-react';

interface ActivityLog {
  id: string;
  actionType: string;
  description: string;
  timestamp: any;
  user: string;
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const q = query(
      collection(db, 'activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'activity_logs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filter === 'All') return true;
    if (filter === 'Orders') return log.actionType?.includes('ORDER');
    if (filter === 'Inventory') return log.actionType?.includes('INVENTORY');
    if (filter === 'Payments') return log.actionType?.includes('PAYMENT');
    return true;
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/10">
        <div>
          <h2 className="text-2xl font-extrabold font-headline text-primary tracking-tight">System Activity</h2>
          <p className="text-on-surface-variant text-sm font-medium">Chronological timeline of system events</p>
        </div>
        
        <div className="relative">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="appearance-none bg-surface-container-low border border-outline-variant/20 text-on-surface-variant text-sm font-bold rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-brandPurple/20 cursor-pointer"
          >
            <option value="All">All Events</option>
            <option value="Orders">Orders</option>
            <option value="Inventory">Inventory</option>
            <option value="Payments">Payments</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm p-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brandPurple" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            No activity logs found.
          </div>
        ) : (
          <div className="relative pl-4 border-l-2 border-gray-200 space-y-8 ml-4">
            {filteredLogs.map((log) => {
              const dateObj = formatTimestamp(log.timestamp);
              const timeStr = dateObj ? dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
              const dateStr = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

              return (
                <div key={log.id} className="relative">
                  {/* Timeline Node */}
                  <div className="absolute -left-[21px] top-1.5 w-3 h-3 bg-[#7D007D] rounded-full ring-4 ring-white" />
                  
                  {/* Content Card */}
                  <div className="pl-6">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-on-surface">{timeStr}</span>
                      <span className="text-xs font-medium text-on-surface-variant/70">{dateStr}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                        {log.user || 'System'}
                      </span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        log.actionType?.includes('ORDER') ? "bg-blue-50 text-blue-600" :
                        log.actionType?.includes('INVENTORY') ? "bg-amber-50 text-amber-600" :
                        log.actionType?.includes('PAYMENT') ? "bg-emerald-50 text-emerald-600" :
                        "bg-gray-50 text-gray-600"
                      )}>
                        {log.actionType?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      {log.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
