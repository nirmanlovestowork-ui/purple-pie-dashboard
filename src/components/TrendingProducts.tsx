import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { ShoppingBag } from 'lucide-react';

interface TrendingProductsProps {
  compact?: boolean;
  orders?: any[];
}

export default function TrendingProducts({ compact, orders = [] }: TrendingProductsProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'overall'>('daily');

  const topItems = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    // Get today's date in YYYY-MM-DD and DD/MM/YYYY
    const today = new Date();
    const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayDMY = today.toLocaleDateString('en-GB');

    const itemCounts: Record<string, { name: string, qty: number, revenue: number }> = {};

    orders.forEach(order => {
      // If Daily tab, only include today's orders
      if (activeTab === 'daily') {
        const orderDateStr = order.date;
        if (orderDateStr !== todayYMD && orderDateStr !== todayDMY) {
          // Additional fallback check by splitting
          const orderDateParts = orderDateStr ? orderDateStr.split(/[-/]/) : []; 
          let isToday = false;
          
          if (orderDateParts.length === 3) {
              const mappedOrderDate = orderDateParts[0].length === 4 
                ? `${orderDateParts[0]}-${orderDateParts[1]}-${orderDateParts[2]}` // YYYY-MM-DD 
                : `${orderDateParts[2]}-${orderDateParts[1]}-${orderDateParts[0]}`; // DD/MM/YYYY to YYYY-MM-DD
                
              if (mappedOrderDate === todayYMD) {
                 isToday = true;
              }
          }
          if (!isToday) return;
        }
      }

      (order.items || []).forEach((item: any) => {
        const name = item.name || 'Unknown Item';
        const qty = item.qty || item.quantity || 1;
        const price = item.price || 0;
        
        if (!itemCounts[name]) {
          itemCounts[name] = { name, qty: 0, revenue: 0 };
        }
        itemCounts[name].qty += qty;
        itemCounts[name].revenue += (qty * price);
      });
    });

    const sortedItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 3);
    
    return sortedItems.map((item, index) => {
        return {
            name: item.name,
            description: `${item.qty} units sold`,
            price: `₹${item.revenue.toFixed(2)}`,
            tag: index === 0 ? 'Top 1' : ''
        };
    });
  }, [orders, activeTab]);

  const displayItems = topItems.length > 0 ? topItems : [];

  return (
    <div className={cn("flex flex-col h-full", compact ? "gap-2" : "gap-4")}>
      <div className="flex bg-gray-100/50 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('daily')}
          className={cn(
            "flex-1 text-xs font-bold py-1.5 rounded-md transition-all text-center",
            activeTab === 'daily' 
              ? "bg-white text-primary shadow-sm" 
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Daily
        </button>
        <button
          onClick={() => setActiveTab('overall')}
          className={cn(
            "flex-1 text-xs font-bold py-1.5 rounded-md transition-all text-center",
            activeTab === 'overall' 
              ? "bg-white text-primary shadow-sm" 
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Overall
        </button>
      </div>

      <div className={cn("flex flex-col flex-1", compact ? "gap-2" : "gap-4")}>
        {displayItems.length > 0 ? (
          displayItems.map((product) => (
            <div 
              key={product.name}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent bg-white shadow-sm",
                !compact && product.tag ? "border-l-4 border-primary pl-3" : "",
                compact ? "hover:bg-gray-50" : "hover:bg-surface-container-low"
              )}
            >
              <div className="flex-grow min-w-0 flex items-center gap-2">
                <h5 className={cn("font-bold text-gray-900 truncate", compact ? "text-xs" : "text-sm")}>{product.name}</h5>
                {product.tag && (
                  <span className="px-1.5 py-0.5 text-[8px] font-bold text-white bg-primary rounded-full shadow-sm whitespace-nowrap">
                    #1
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-bold whitespace-nowrap",
                  compact ? "text-xs" : "text-sm",
                  product.tag ? "text-primary" : "text-gray-900"
                )}>
                  {product.price}
                </p>
                <p className="text-[10px] text-gray-500 font-semibold">{product.description}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-4 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
            <ShoppingBag className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-400 font-medium text-center">No orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
