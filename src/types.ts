export interface Order {
  id: string;
  customer: string;
  customerInitials: string;
  product: string;
  amount: number;
  status: 'Shipped' | 'Preparing' | 'Delivered' | 'Pending';
  pickupValue?: string;
  color: string;
}

export interface StockItem {
  name: string;
  percentage: number;
  lowStock?: boolean;
}

export interface TrendingProduct {
  name: string;
  description: string;
  price: string;
  image: string;
  tag?: string;
}

export interface ChartData {
  day: string;
  value: number;
  isHighlight?: boolean;
}
