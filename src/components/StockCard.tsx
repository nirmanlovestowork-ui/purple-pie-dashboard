import { Package } from 'lucide-react';
import { STOCK_ITEMS } from '../constants';
import { cn } from '../lib/utils';

export default function StockCard() {
  return (
    <div className="col-span-4 bg-white p-8 rounded-xl bakery-shadow flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <h4 className="text-lg font-bold text-primary font-headline">Food stock</h4>
        <Package className="text-tertiary-container" size={24} />
      </div>
      
      <div className="space-y-6 flex-grow">
        {STOCK_ITEMS.map((item) => (
          <div key={item.name}>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-on-surface">{item.name}</span>
              <span className={cn(item.lowStock ? "text-tertiary-container" : "text-primary")}>
                {item.percentage}%
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  item.lowStock ? "bg-tertiary-container" : "primary-gradient"
                )}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            {item.lowStock && (
              <p className="text-[10px] text-tertiary font-bold mt-1 uppercase">Low Stock Alert</p>
            )}
          </div>
        ))}
      </div>

      <button className="mt-8 w-full py-4 bg-secondary-container text-primary font-bold text-sm rounded-xl hover:bg-secondary-container/80 btn-smooth">
        Manage Inventory
      </button>
    </div>
  );
}
