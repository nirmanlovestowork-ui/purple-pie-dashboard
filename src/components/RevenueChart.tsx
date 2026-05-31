import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { REVENUE_DATA } from '../constants';

export default function RevenueChart() {
  return (
    <div className="col-span-8 bg-white p-8 rounded-xl bakery-shadow min-h-[400px]">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h4 className="text-lg font-bold text-primary font-headline">Revenue Performance</h4>
          <p className="text-sm text-on-surface-variant">Daily sales volume over the last 30 days</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-secondary-container text-primary text-xs font-bold rounded-xl btn-smooth">Weekly</button>
          <button className="px-4 py-2 text-on-surface-variant text-xs font-bold rounded-xl hover:bg-surface-container-low btn-smooth">Monthly</button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={REVENUE_DATA} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#4c4451' }}
              dy={10}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white bakery-shadow px-3 py-1 rounded text-[10px] font-bold text-primary border border-accent-gold/30">
                      ${(Number(payload[0].value) * 100).toFixed(2)}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {REVENUE_DATA.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isHighlight ? "url(#primaryGradient)" : "#4b00821a"} 
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2e0052" />
                <stop offset="100%" stopColor="#4b0082" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
