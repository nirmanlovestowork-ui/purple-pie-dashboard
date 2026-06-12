import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus, Trash2, Search, CreditCard, Banknote, Loader2, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, query, getDocs, where, doc, updateDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import BluetoothPrinterButton from './BluetoothPrinterButton';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editMode?: boolean;
  initialData?: any;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

import { useToast } from '../context/ToastContext';

export default function NewOrderModal({ isOpen, onClose, onSuccess, editMode = false, initialData = null }: NewOrderModalProps) {
  const { showToast } = useToast();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ id: '', name: '', price: 0, quantity: 1 }]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [inventory, setInventory] = useState<{id: string, name: string, price: number, maintainStock?: boolean, stock?: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAddress, setShowAddress] = useState(false);
  const [addressApt, setAddressApt] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('Odisha');
  const [addressPin, setAddressPin] = useState('');
  const [store, setStore] = useState<string>('BRAHMESWARPATNA');
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  const isPinValid = addressPin === '' || /^\d{6}$/.test(addressPin);

  const resetForm = () => {
    setCustomerName('');
    setPhoneNumber('');
    setItems([{ id: '', name: '', price: 0, quantity: 1 }]);
    setDiscount(0);
    setPaymentMethod('CASH');
    setStore('BRAHMESWARPATNA');
    setShowAddress(false);
    setAddressApt('');
    setAddressStreet('');
    setAddressCity('');
    setAddressState('Odisha');
    setAddressPin('');
    setIsEditingInvoice(false);
    setStore('');
    setCompletedOrder(null);
  };

  useEffect(() => {
    if (isOpen) {
      const initializeData = async () => {
        const fetchedInventory = await fetchInventory();
        if (editMode && initialData) {
          setInvoiceNumber(initialData.invoiceNo || '');
          setCustomerName(initialData.customerName || '');
          setPhoneNumber(initialData.customerPhone === 'N/A' ? '' : (initialData.customerPhone || ''));
          setDiscount(initialData.discount || 0);
          setPaymentMethod(initialData.paymentMethod || 'CASH');
          setStore(initialData.store || '');
          
          if (initialData.items && initialData.items.length > 0) {
            // Map existing items to the form structure
            setItems(initialData.items.map((i: any) => {
              // Try to find the matching item in inventory to get its ID
              const matchedInv = fetchedInventory.find(inv => inv.name === i.name);
              return {
                id: matchedInv ? matchedInv.id : (i.id || i.name), // Fallback to name if id is missing
                name: i.name,
                price: i.price,
                quantity: i.qty || i.quantity
              };
            }));
          } else {
            setItems([{ id: '', name: '', price: 0, quantity: 1 }]);
          }

          if (initialData.address && Object.keys(initialData.address).length > 0) {
            setShowAddress(true);
            setAddressApt(initialData.address.apt || '');
            setAddressStreet(initialData.address.street || '');
            setAddressCity(initialData.address.city || '');
            setAddressState(initialData.address.state || 'Odisha');
            setAddressPin(initialData.address.pin || '');
          } else {
            setShowAddress(false);
          }
        } else {
          resetForm();
          fetchInvoiceNumber();
        }
      };
      initializeData();
    }
  }, [isOpen, editMode, initialData]);

  const fetchInvoiceNumber = async () => {
    try {
      const q = query(
        collection(db, 'orders')
      );
      const querySnapshot = await getDocs(q);
      let maxNum = 0;
      querySnapshot.forEach((doc) => {
        const invoiceNo = doc.data().invoiceNo;
        if (invoiceNo && invoiceNo.startsWith('TPP/26-27/')) {
          const numStr = invoiceNo.split('/').pop();
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      setInvoiceNumber(`TPP/26-27/${maxNum + 1}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'orders');
    }
  };

  const fetchInventory = async () => {
    try {
      const q = query(collection(db, 'inventory'));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setInventory(items);
      return items;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'inventory');
      return [];
    }
  };

  const addItemRow = () => {
    setItems([...items, { id: '', name: '', price: 0, quantity: 1 }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemName = (index: number, name: string) => {
    const newItems = [...items];
    const item = newItems[index];
    item.name = name;
    
    const matchedInv = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (matchedInv) {
      if (matchedInv.maintainStock !== false && (matchedInv.stock === undefined || matchedInv.stock <= 0)) {
        showToast(`Cannot add ${matchedInv.name}. Out of stock!`, "error");
        return;
      }
      item.id = matchedInv.id;
      item.price = matchedInv.price;
    } else {
      item.id = '';
    }
    
    setItems(newItems);
  };

  const updateItemPrice = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].price = price;
    setItems(newItems);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    const item = newItems[index];
    const invItem = inventory.find(i => i.id === item.id);
    
    const newQuantity = Math.max(1, item.quantity + delta);
    
    if (invItem && invItem.maintainStock !== false) {
      const currentStock = invItem.stock || 0;
      if (newQuantity > currentStock) {
        showToast(`Cannot add more. Only ${currentStock} in stock!`, "error");
        return;
      }
    }
    
    newItems[index].quantity = newQuantity;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const isPhoneValid = phoneNumber === '' || /^\d{10}$/.test(phoneNumber);

  const handleSubmit = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    
    if (!customerName || items.length === 0 || items.some(i => !i.name.trim())) {
      showToast("Please fill in all required fields and add at least one item", "error");
      return;
    }

    if (showAddress && addressPin && !isPinValid) {
      showToast("Please enter a valid 6-digit pincode", "error");
      return;
    }

    if (grandTotal <= 0) {
      showToast("Order total must be greater than 0", "error");
      return;
    }

    if (!store) {
      showToast("Please select a store to proceed", "error");
      return;
    }

    if (!editMode && !invoiceNumber) {
      showToast("Invoice number is not generated yet. Please wait or refresh the page.", "error");
      return;
    }

    // Check inventory stock before submitting
    for (const item of items) {
      if (item.id) {
        const invItem = inventory.find(i => i.id === item.id);
        if (invItem && invItem.maintainStock !== false) {
          const currentStock = invItem.stock || 0;
          if (currentStock < item.quantity) {
            showToast(`Insufficient stock for ${item.name}. Available: ${currentStock}`, "error");
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    setLoading(true);
    try {
      // Add new items to inventory
      for (const item of items) {
        if (!item.id && item.name.trim()) {
          const newInvDoc = doc(collection(db, 'inventory'));
          await setDoc(newInvDoc, {
            name: item.name.trim(),
            price: Number(item.price) || 0,
            maintainStock: false,
            stock: 0,
            createdAt: serverTimestamp()
          });
          item.id = newInvDoc.id;
        }
      }
      if (editMode && initialData?.id) {
        // Update existing order in Firestore
        const orderRef = doc(db, 'orders', initialData.id);
        await updateDoc(orderRef, {
          customerName: customerName || 'Guest',
          customerPhone: phoneNumber,
          addressApt: showAddress ? addressApt : '',
          addressStreet: showAddress ? addressStreet : '',
          addressCity: showAddress ? addressCity : '',
          addressState: showAddress ? addressState : '',
          addressPin: showAddress ? addressPin : '',
          paymentMethod: paymentMethod,
          store,
          subtotal: Number(subtotal),
          discount: Number(discount),
          grandTotal: Number(grandTotal),
          items: items.map(i => ({ name: i.name, qty: i.quantity, price: i.price, subtotal: i.price * i.quantity }))
        });
        
        resetForm();
        onSuccess();
        onClose();
      } else {
        // Submit to Apps Script
        const url = (import.meta as any).env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyjsvCGt-8OkmeYoIYtfVNNJBUh-efJFG3W5C_QRg_SuzK0BCkCbMWT_f0Xb6FDmVw/exec';
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const payload = {
          date: dateStr,
          time: timeStr,
          invoiceNo: invoiceNumber,
          customerName: customerName || 'Guest',
          customerPhone: phoneNumber,
          addressApt: showAddress ? addressApt : '',
          addressStreet: showAddress ? addressStreet : '',
          addressCity: showAddress ? addressCity : '',
          addressState: showAddress ? addressState : '',
          addressPin: showAddress ? addressPin : '',
          source: 'Offline',
          store,
          paymentMethod: paymentMethod,
          subtotal: Number(subtotal) || 0,
          discount: Number(discount) || 0,
          grandTotal: Number(grandTotal) || 0,
          isScheduled: false,
          items: items.map(i => ({ name: i.name, qty: i.quantity, price: Number(i.price) || 0, subtotal: (Number(i.price) || 0) * i.quantity })),
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp()
        };

        // Save to Firestore
        const newOrderRef = doc(db, 'orders', invoiceNumber);
        await setDoc(newOrderRef, payload);

        // Update inventory
        for (const item of items) {
          const invItem = inventory.find(i => i.id === item.id);
          if (invItem && invItem.maintainStock !== false) {
            const currentStock = invItem.stock || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            await updateDoc(doc(db, 'inventory', item.id), {
              stock: newStock
            });
          }
        }

        // Save to Firestore
        await addDoc(collection(db, 'orders'), {
          ...payload,
          createdAt: serverTimestamp()
        });

        // Submit to Apps Script if configured
        if (url) {
          fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          }).catch(fetchErr => {
            console.error("Failed to submit to Apps Script:", fetchErr);
          });
        }
        
        setCompletedOrder(payload);
        onSuccess();
      }
    } catch (e) {
      console.error("Failed to commit order: ", e);
      if (editMode) {
        handleFirestoreError(e, OperationType.UPDATE, 'orders');
      } else {
        showToast("Failed to record sale. Please try again.", "error");
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCloseBill = () => {
    resetForm();
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="drawer-backdrop"
          onClick={onClose}
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="drawer-content !max-w-[100%] md:!max-w-[100%] lg:!max-w-[45%]"
          >
            {completedOrder ? (
              <div className="flex flex-col h-full bg-[#f0f0f0] print-receipt-container">
                <div className="drawer-header !bg-green-600 print-hidden">
                  <div>
                    <h2 className="text-2xl font-bold font-headline text-white">Order Success!</h2>
                    <p className="text-white/80 text-sm">Invoice No: {completedOrder.invoiceNo}</p>
                  </div>
                  <button onClick={handleCloseBill} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                    <X size={32} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-[#f0f0f0] print:bg-white print:p-0">
                  <div className="mx-auto w-full max-w-[320px] bg-white px-6 py-8 shadow-xl relative mt-4 mb-8 receipt-edges print:shadow-none print:m-0 print:w-full print:max-w-full font-mono text-gray-800 h-max min-h-max">
                    <div className="text-center pb-4">
                      <img src="/bw_logo.jpeg" alt="The Purple Pie Logo" className="w-24 h-auto mx-auto mb-3" />
                      <h1 className="font-bold text-xl uppercase tracking-wider mb-1 text-black ">{completedOrder.store || 'THE PURPLE PIE'}</h1>
                      <p className="text-xs text-gray-600">Premium Cakes & Bakes</p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase">Tax Invoice</p>
                    </div>

                    <div className="text-xs border-y border-dashed border-gray-400 py-3 mb-4 space-y-1">
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{completedOrder.date} {completedOrder.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Invoice:</span>
                        <span className="font-bold">#{completedOrder.invoiceNo.split(' ')[0] || completedOrder.invoiceNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer:</span>
                        <span className="truncate max-w-[150px] text-right">{completedOrder.customerName}</span>
                      </div>
                      {completedOrder.customerPhone && (
                        <div className="flex justify-between">
                          <span>Phone:</span>
                          <span>{completedOrder.customerPhone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="text-left font-bold pb-2 pr-2">Item</th>
                            <th className="text-center font-bold pb-2 px-2">Qty</th>
                            <th className="text-right font-bold pb-2 pl-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="align-top">
                          {completedOrder.items.map((item: any, idx: number) => {
                            const qty = item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 1);
                            return (
                            <tr key={idx}>
                              <td className="py-2 pr-2">
                                <div className="font-medium text-black">{item.name}</div>
                                <div className="text-[10px] text-gray-500">@ {Number(item.price || 0).toFixed(2)}</div>
                              </td>
                              <td className="py-2 px-2 text-center">{qty}</td>
                              <td className="py-2 pl-2 text-right">₹{Number(item.subtotal || (item.price * qty) || 0).toFixed(2)}</td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t border-dashed border-gray-400 pt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Subtotal</span>
                        <span>₹{Number(completedOrder.subtotal || 0).toFixed(2)}</span>
                      </div>
                      {(completedOrder.discount > 0) && (
                        <div className="flex justify-between text-xs text-black">
                          <span>Discount</span>
                          <span>-₹{Number(completedOrder.discount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-black">
                        <span>TOTAL</span>
                        <span>₹{Number(completedOrder.grandTotal !== undefined ? completedOrder.grandTotal : completedOrder.totalAmount || 0).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between text-xs mt-3 pt-3 border-t border-gray-200">
                        <span className="text-gray-500">Payment</span>
                        <span className="font-bold uppercase">{completedOrder.paymentMethod}</span>
                      </div>
                    </div>

                    <div className="text-center mt-8 pt-4 border-t border-dashed border-gray-400">
                      <p className="text-xs font-bold uppercase tracking-widest text-black">Thank You!</p>
                      <p className="text-[10px] text-gray-500 mt-1">Please keep this receipt for your records.</p>
                    </div>
                  </div>
                </div>

                <div className="drawer-footer !bg-[#f0f0f0] border-t-0 flex gap-3 print-hidden relative">
                  <BluetoothPrinterButton order={completedOrder} />
                  <button 
                    onClick={handlePrint}
                    className="flex-1 py-4 font-bold rounded-xl transition-all border-2 border-primary text-primary hover:bg-primary/5 active:scale-[0.98] flex items-center justify-center gap-2 bg-white"
                  >
                    Print Bill
                  </button>
                  <button 
                    onClick={handleCloseBill}
                    className="flex-1 py-4 font-bold rounded-xl transition-all bg-primary text-white hover:bg-primary/90 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full print-hidden">
                {/* Header */}
            <div className="drawer-header !bg-primary !text-white">
              <div>
                <h2 className="text-2xl font-bold font-headline">New Sales Order</h2>
                <div className="flex items-center gap-4 mt-1 text-white/70 text-xs">
                  <span>{new Date().toLocaleString()}</span>
                  <div className="flex items-center gap-1">
                    <span>Invoice:</span>
                    <span className="font-bold text-accent-gold">
                      {invoiceNumber}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-accent-gold">
                <X size={32} />
              </button>
            </div>

            {/* Content */}
            <div className="drawer-body !bg-[#F3E8FF]/20">
              
              {/* Store Selection */}
              <div className="space-y-3 mb-6">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                  Select Store <span className="text-accent-gold">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStore('BRAHMESWARPATNA')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2",
                      store === 'BRAHMESWARPATNA' 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-primary/10 bg-white text-on-surface hover:border-primary/30"
                    )}
                  >
                    BRAHMESWARPATNA
                  </button>
                  <button
                    type="button"
                    onClick={() => setStore('BYPASS FOOD COURT')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2",
                      store === 'BYPASS FOOD COURT' 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-primary/10 bg-white text-on-surface hover:border-primary/30"
                    )}
                  >
                    BYPASS FOOD COURT
                  </button>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                    Customer Name <span className="text-accent-gold">*</span>
                  </label>
                  <input 
                    className="drawer-input"
                    placeholder="Enter name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Phone Number</label>
                  <input 
                    className={cn(
                      "drawer-input",
                      !isPhoneValid ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : (phoneNumber !== '' ? "border-primary focus:border-primary" : "")
                    )}
                    placeholder="Enter phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  {!isPhoneValid && <p className="text-xs text-red-500 font-medium">Please enter a valid 10-digit mobile number or leave blank.</p>}
                </div>

                {/* Address Toggle */}
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-primary/5 shadow-sm">
                  <span className="text-sm font-bold text-primary">Add Delivery Address</span>
                  <button
                    onClick={() => setShowAddress(!showAddress)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      showAddress ? "bg-primary" : "bg-gray-200"
                    )}
                  >
                    <span className={cn(
                      "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform",
                      showAddress ? "transform translate-x-5" : ""
                    )} />
                  </button>
                </div>

                {/* Address Fields */}
                <AnimatePresence>
                  {showAddress && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Apt/House No.</label>
                          <input 
                            className="drawer-input !p-3"
                            placeholder="e.g. 4B"
                            value={addressApt}
                            onChange={(e) => setAddressApt(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Street Address</label>
                          <input 
                            className="drawer-input !p-3"
                            placeholder="Street name"
                            value={addressStreet}
                            onChange={(e) => setAddressStreet(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">City</label>
                          <input 
                            className="drawer-input !p-3"
                            placeholder="City"
                            value={addressCity}
                            onChange={(e) => setAddressCity(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">State</label>
                          <select 
                            className="drawer-input appearance-none !p-3"
                            value={addressState}
                            onChange={(e) => setAddressState(e.target.value)}
                          >
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                            <option value="Assam">Assam</option>
                            <option value="Bihar">Bihar</option>
                            <option value="Chhattisgarh">Chhattisgarh</option>
                            <option value="Goa">Goa</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Haryana">Haryana</option>
                            <option value="Himachal Pradesh">Himachal Pradesh</option>
                            <option value="Jharkhand">Jharkhand</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Manipur">Manipur</option>
                            <option value="Meghalaya">Meghalaya</option>
                            <option value="Mizoram">Mizoram</option>
                            <option value="Nagaland">Nagaland</option>
                            <option value="Odisha">Odisha</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Sikkim">Sikkim</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Tripura">Tripura</option>
                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                            <option value="Uttarakhand">Uttarakhand</option>
                            <option value="West Bengal">West Bengal</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Pincode</label>
                          <input 
                            className={cn(
                              "drawer-input !p-3",
                              !isPinValid ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                            )}
                            placeholder="6 digits"
                            value={addressPin}
                            onChange={(e) => setAddressPin(e.target.value)}
                          />
                          {!isPinValid && <p className="text-[10px] text-red-500 font-medium">Invalid pincode.</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Items List */}
              <div className="space-y-6 pt-8 border-t border-primary/5">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-primary font-headline">Order Items</h3>
                  <button 
                    onClick={addItemRow}
                    className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/70 transition-colors"
                  >
                    <Plus size={16} />
                    Add Product
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="space-y-4 bg-white p-6 rounded-2xl border border-primary/5 shadow-sm relative">
                      <button 
                        onClick={() => removeItemRow(index)}
                        className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                            Product <span className="text-accent-gold">*</span>
                          </label>
                          <input 
                            type="text"
                            list={`inventory-list-${index}`}
                            className="drawer-input !p-3"
                            placeholder="Enter or select product"
                            value={item.name}
                            onChange={(e) => updateItemName(index, e.target.value)}
                          />
                          <datalist id={`inventory-list-${index}`}>
                            {inventory.map(inv => (
                              <option key={inv.id} value={inv.name} />
                            ))}
                          </datalist>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                            Price <span className="text-accent-gold">*</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-on-surface-variant">₹</span>
                            <input 
                              type="number"
                              className="drawer-input !p-3 flex-1"
                              placeholder="Price"
                              value={item.price || ''}
                              onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-4">
                        <div className="space-y-2 flex-grow">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Quantity</label>
                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 w-fit border border-primary/10">
                            <button onClick={() => updateQuantity(index, -1)} className="p-1.5 hover:bg-white rounded-md transition-colors"><Minus size={14}/></button>
                            <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                            <button onClick={() => updateQuantity(index, 1)} className="p-1.5 hover:bg-white rounded-md transition-colors"><Plus size={14}/></button>
                          </div>
                        </div>
                        <div className="text-right">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Subtotal</label>
                          <p className="text-lg font-bold text-primary">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Totals */}
              <div className="space-y-8 pt-8 border-t border-primary/5">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Payment Method</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setPaymentMethod('CASH')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all",
                        paymentMethod === 'CASH' ? "border-primary bg-primary/5 text-primary" : "border-primary/5 text-on-surface-variant bg-white"
                      )}
                    >
                      <Banknote size={20} />
                      <span className="font-bold">CASH</span>
                    </button>
                    <button 
                      onClick={() => setPaymentMethod('UPI')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all",
                        paymentMethod === 'UPI' ? "border-primary bg-primary/5 text-primary" : "border-primary/5 text-on-surface-variant bg-white"
                      )}
                    >
                      <CreditCard size={20} />
                      <span className="font-bold">UPI</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-2xl border border-primary/5 shadow-sm">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant font-medium">Subtotal</span>
                    <span className="font-bold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-on-surface-variant font-medium">Discount</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-on-surface-variant">₹</span>
                      <input 
                        type="number" 
                        className="w-24 p-2 bg-gray-50 rounded-lg border border-primary/10 text-right text-sm font-bold focus:border-primary focus:ring-2 focus:ring-accent-gold/20 outline-none transition-all"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-primary/5 flex justify-between items-center">
                    <span className="text-lg font-bold text-primary">Grand Total</span>
                    <span className="text-3xl font-extrabold text-primary font-headline">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="drawer-footer">
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !isPhoneValid || (showAddress && !isPinValid)}
                className={cn(
                  "w-full py-5 bg-gradient-to-br from-primary to-[#5b1b99] text-white font-bold rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3",
                  (isSubmitting || !isPhoneValid || (showAddress && !isPinValid)) && "opacity-70 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    <span>Record & Finish Sale</span>
                  </>
                )}
              </button>
            </div>
          </div>
          )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
