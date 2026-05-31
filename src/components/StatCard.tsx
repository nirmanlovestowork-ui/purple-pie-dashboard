import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  variant?: 'default' | 'primary';
  iconBg?: string;
  iconColor?: string;
}

export default function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  trendUp, 
  variant = 'default',
  iconBg,
  iconColor
}: StatCardProps) {
  if (variant === 'primary') {
    return (
      <div className="col-span-3 primary-gradient p-8 rounded-xl bakery-shadow text-white">
        <div className="flex justify-between items-start mb-4">
          <span className="p-3 bg-white/20 rounded-xl text-white">
            <Icon size={24} />
          </span>
          <span className="text-xs font-bold text-accent-gold">Healthy</span>
        </div>
        <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-bold font-headline">{value}</h3>
      </div>
    );
  }

  return (
    <div className="col-span-3 bg-white p-8 rounded-xl bakery-shadow">
      <div className="flex justify-between items-start mb-4">
        <span className={cn("p-3 rounded-xl", iconBg, iconColor)}>
          <Icon size={24} />
        </span>
        {trend && (
          <span className={cn("text-xs font-bold", trendUp ? "text-tertiary-container" : "text-red-500")}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-on-surface font-headline">{value}</h3>
    </div>
  );
}
