import { Order, StockItem, TrendingProduct, ChartData } from './types';

export const UPCOMING_ORDERS: Order[] = [
  {
    id: '#90210',
    customer: 'Sarah Miller',
    customerInitials: 'SM',
    product: 'Lavender Scone (6x)',
    amount: 32.50,
    status: 'Pending',
    pickupValue: '14:30',
    color: 'bg-brandPurple/10 text-brandPurple'
  },
  {
    id: '#90211',
    customer: 'Robert Jones',
    customerInitials: 'RJ',
    product: 'Truffle Berry Pie',
    amount: 48.00,
    status: 'Preparing',
    pickupValue: '15:15',
    color: 'bg-amber-100 text-amber-700'
  },
  {
    id: '#90212',
    customer: 'Anna Lee',
    customerInitials: 'AL',
    product: 'Lemon Tart',
    amount: 18.50,
    status: 'Pending',
    pickupValue: '16:00',
    color: 'bg-emerald-100 text-emerald-700'
  }
];

export const STOCK_ITEMS: StockItem[] = [
  { name: 'Artisan Flour', percentage: 82 },
  { name: 'French Butter', percentage: 24, lowStock: true },
  { name: 'Organic Berries', percentage: 68 },
  { name: 'Dark Chocolate', percentage: 94 }
];

export const TOP_SELLERS: TrendingProduct[] = [
  {
    name: 'Dual-Tone Chocolate Cake',
    description: 'Top Selling this week',
    price: 'Rs. 750',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=200&h=200',
    tag: 'Signature'
  },
  {
    name: 'Vanilla Latte Tiramisu Cake',
    description: 'Trending Item',
    price: 'Rs. 500',
    image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&q=80&w=200&h=200'
  }
];

export const REVENUE_DATA: ChartData[] = [
  { day: 'MON', value: 40 },
  { day: 'TUE', value: 80, isHighlight: true },
  { day: 'WED', value: 65 },
  { day: 'THU', value: 45 },
  { day: 'FRI', value: 60 },
  { day: 'SAT', value: 75 },
  { day: 'SUN', value: 55 }
];
