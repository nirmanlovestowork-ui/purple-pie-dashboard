import React from 'react';
import OrdersTable from './OrdersTable';

export default function UpcomingOrders() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold font-headline text-primary tracking-tight">Upcoming Orders</h2>
        <p className="text-on-surface-variant text-sm font-medium">View all scheduled orders</p>
      </div>
      <div className="bg-white p-4 md:p-8 rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <OrdersTable filterToday={false} />
      </div>
    </div>
  );
}
