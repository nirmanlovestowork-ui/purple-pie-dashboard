import { TOP_SELLERS } from '../constants';
import { cn } from '../lib/utils';

interface TrendingProductsProps {
  compact?: boolean;
}

export default function TrendingProducts({ compact }: TrendingProductsProps) {
  const displayItems = compact ? TOP_SELLERS.slice(0, 2) : TOP_SELLERS;

  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-6")}>
      {displayItems.map((product) => (
        <div 
          key={product.name}
          className={cn(
            "flex items-center gap-4 p-2 rounded-lg transition-colors",
            !compact && product.tag === 'Signature' && "border-l-4 border-accent-gold pl-4",
            compact ? "hover:bg-gray-50" : "hover:bg-surface-container-low"
          )}
        >
          <img 
            src={product.image} 
            alt={product.name} 
            className={cn("rounded-md object-cover shadow-sm border border-transparent", compact ? "h-10 w-10" : "h-14 w-14")}
            referrerPolicy="no-referrer"
          />
          <div className="flex-grow">
            <h5 className={cn("font-bold text-gray-900", compact ? "text-xs" : "text-sm")}>{product.name}</h5>
            {!compact && <p className="text-[10px] text-on-surface-variant uppercase font-semibold">{product.description}</p>}
          </div>
          <p className={cn(
            "font-bold",
            compact ? "text-xs" : "text-sm",
            !compact && product.tag === 'Signature' ? "text-accent-gold" : "text-gray-900"
          )}>
            {product.price}
          </p>
        </div>
      ))}
    </div>
  );
}
