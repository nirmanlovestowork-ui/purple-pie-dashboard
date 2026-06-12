import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../context/ToastContext';

interface ScheduledOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduledOrderModal({ isOpen, onClose }: ScheduledOrderModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [store, setStore] = useState<string>('BRAHMESWARPATNA');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [cakeFlavor, setCakeFlavor] = useState('');
  const [weight, setWeight] = useState<number | ''>('');
  const [message, setMessage] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = React.useRef(false);
  
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (isSubmitting || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setError('');
    
    if (customerPhone && !/^\d{10}$/.test(customerPhone)) {
      setError('Phone number must be exactly 10 digits or left blank.');
      isSubmittingRef.current = false;
      return;
    }
    if (!customerName || !deliveryDate || !deliveryTime) {
      setError('Please fill in Name, Date, and Time.');
      isSubmittingRef.current = false;
      return;
    }
    if (!store) {
      setError('Please select a store.');
      isSubmittingRef.current = false;
      return;
    }
    if (totalAmount <= 0) {
      setError('Total amount must be greater than 0.');
      isSubmittingRef.current = false;
      return;
    }

    setIsSubmitting(true);
    try {
      // Format date to DD/MM/YYYY
      const dateObj = new Date(deliveryDate);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const formattedDate = `${dd}/${mm}/${yyyy}`;

      // Format time to 12-hour AM/PM
      let formattedTime = deliveryTime;
      if (deliveryTime) {
        const [hours, minutes] = deliveryTime.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        formattedTime = `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
      }

      await addDoc(collection(db, 'orders'), {
        customerName,
        customerPhone,
        date: formattedDate,
        time: formattedTime,
        deliveryDate: formattedDate, // Keep for backward compatibility if needed
        deliveryTime: formattedTime,
        cakeFlavor,
        weight: Number(weight) || 0,
        message,
        totalAmount,
        advancePaid,
        balanceDue: Math.max(0, totalAmount - advancePaid),
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
        isScheduled: true,
        source: 'Offline',
        store,
        paymentMethod: 'CASH',
        items: [{ name: `${cakeFlavor} Cake (${weight}kg)`, price: totalAmount, qty: 1 }]
      });
      showToast('Scheduled order saved successfully!', 'success');
      
      setCustomerName('');
      setCustomerPhone('');
      setStore('BRAHMESWARPATNA');
      setDeliveryDate('');
      setDeliveryTime('');
      setCakeFlavor('');
      setWeight('');
      setMessage('');
      setTotalAmount(0);
      setAdvancePaid(0);
      
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save scheduled order.');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
        >
          <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
            <div className="flex items-center gap-3 text-primary">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar size={20} />
              </div>
              <h3 className="text-xl font-bold font-headline">Schedule Custom Order</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surface-container-low rounded-full transition-colors text-on-surface-variant"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Store Selection */}
              <div className="col-span-1 md:col-span-2 space-y-3 mb-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                  Select Store <span className="text-accent-gold">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStore('BRAHMESWARPATNA')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${store === 'BRAHMESWARPATNA' ? 'border-primary bg-primary/10 text-primary' : 'border-primary/10 bg-white text-on-surface hover:border-primary/30'}`}
                  >
                    BRAHMESWARPATNA
                  </button>
                  <button
                    type="button"
                    onClick={() => setStore('BYPASS FOOD COURT')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${store === 'BYPASS FOOD COURT' ? 'border-primary bg-primary/10 text-primary' : 'border-primary/10 bg-white text-on-surface hover:border-primary/30'}`}
                  >
                    BYPASS FOOD COURT
                  </button>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-4 md:col-span-2">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant/10 pb-2">Customer Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Customer Name *</label>
                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Enter name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Phone Number</label>
                    <input type="tel" value={customerPhone} onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setCustomerPhone(val);
                    }} className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none" placeholder="10-digit number" />
                  </div>
                </div>
              </div>

              {/* Delivery/Pickup */}
              <div className="space-y-4 md:col-span-2">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant/10 pb-2">Delivery / Pickup</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Date *</label>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Time *</label>
                    <input type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none" />
                  </div>
                </div>
              </div>

              {/* Cake Details */}
              <div className="space-y-4 md:col-span-2">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant/10 pb-2">Cake Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Cake Flavor</label>
                    <input list="cake-flavors" type="text" value={cakeFlavor} onChange={e => setCakeFlavor(e.target.value)} className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none" placeholder="e.g. Chocolate Truffle" />
                    <datalist id="cake-flavors">
                      <option value="Chocolate Truffle" />
                      <option value="Black Forest" />
                      <option value="Pineapple" />
                      <option value="Red Velvet" />
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Weight (Kg)</label>
                    <input type="number" step="0.5" min="0.5" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none" placeholder="e.g. 1.5" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Message on Cake</label>
                    <textarea rows={2} value={message} onChange={e => setMessage(e.target.value)} className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none resize-none" placeholder="Happy Birthday..."></textarea>
                  </div>
                </div>
              </div>

              {/* Financials */}
              <div className="space-y-4 md:col-span-2">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant/10 pb-2">Financials</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">₹</span>
                      <input 
                        type="number" 
                        value={totalAmount || ''}
                        onChange={(e) => setTotalAmount(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none" 
                        placeholder="0" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Advance Paid</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">₹</span>
                      <input 
                        type="number" 
                        value={advancePaid || ''}
                        onChange={(e) => setAdvancePaid(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none" 
                        placeholder="0" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Balance Due</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">₹</span>
                      <input 
                        type="number" 
                        value={Math.max(0, totalAmount - advancePaid)}
                        readOnly
                        className="w-full pl-8 pr-3 py-3 bg-surface-container-low/50 border border-outline-variant/10 rounded-xl text-sm font-bold text-on-surface outline-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-outline-variant/10 bg-surface-container-low/30 flex gap-3 justify-end">
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : 'Save Scheduled Order'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
