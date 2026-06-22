import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Search, Edit2, Trash2, X, AlertCircle, 
  ChevronLeft, ChevronRight, Loader2, Package, Lock, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, getDocs, query, limit 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType, logAudit } from '../lib/firebaseUtils';
import { useAuth } from '../context/AuthContext';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  maintainStock?: boolean;
}

const SEED_ITEMS = [
  { name: 'Test item 1', category: 'Pies', price: 100, stock: 50, maintainStock: true },
  { name: 'Test item 2', category: 'Cookies', price: 150, stock: 40, maintainStock: true },
  { name: 'Test item 3', category: 'Cakes', price: 200, stock: 30, maintainStock: true },
  { name: 'Test item 4', category: 'Pastries', price: 250, stock: 25, maintainStock: true },
  { name: 'Test item 5', category: 'Beverages', price: 300, stock: 20, maintainStock: true },
];

import { useToast } from '../context/ToastContext';

export default function InventoryManagement({ isAddItemModalOpen, setIsAddItemModalOpen, compact }: { isAddItemModalOpen?: boolean, setIsAddItemModalOpen?: (open: boolean) => void, compact?: boolean }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = isAddItemModalOpen !== undefined ? isAddItemModalOpen : internalModalOpen;
  const setIsModalOpen = setIsAddItemModalOpen || setInternalModalOpen;
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAllowed } = useAuth();
  const isAdmin = isAllowed;
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    initialStock: '0',
    maintainStock: true
  });

  useEffect(() => {
    const q = collection(db, 'inventory');
    const unsubscribeSnap = onSnapshot(q, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      
      if (inventoryData.length === 0 && loading) {
        seedInventory();
      } else {
        setItems(inventoryData);
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
      setLoading(false);
    });

    return () => {
      unsubscribeSnap();
    };
  }, []);

  const seedInventory = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      const inventoryRef = collection(db, 'inventory');
      for (const item of SEED_ITEMS) {
        await addDoc(inventoryRef, item);
      }
    } catch (e) {
      console.error("Error seeding inventory: ", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        price: item.price.toString(),
        initialStock: item.stock.toString(),
        maintainStock: item.maintainStock !== false
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', category: '', price: '', initialStock: '0', maintainStock: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const data = {
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      stock: parseInt(formData.initialStock, 10) || 0,
      maintainStock: formData.maintainStock
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'inventory', editingItem.id), data);
        await logAudit('ITEM_UPDATED', `Updated item ${data.name}`);
        showToast(`Updated ${data.name} successfully!`, 'success');
      } else {
        await addDoc(collection(db, 'inventory'), data);
        await logAudit('ITEM_ADDED', `Added item ${data.name}`);
        showToast(`Added ${data.name} to inventory!`, 'success');
      }
      setIsModalOpen(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const itemToDelete = items.find(i => i.id === id);
    try {
      await deleteDoc(doc(db, 'inventory', id));
      await logAudit('ITEM_DELETED', `Deleted item ${itemToDelete?.name || id}`);
      showToast(`${itemToDelete?.name || 'Item'} removed from inventory.`, 'success');
      setIsDeleteConfirmOpen(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'inventory');
    }
  };

  if (compact) {
    return (
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 w-full skeleton-pulse" />
          ))
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No items in inventory.</p>
        ) : (
          items.slice(0, 5).map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-900">{item.name}</span>
                <span className="text-[10px] text-gray-400 font-medium">{item.category}</span>
              </div>
              <div className="text-right">
                {item.maintainStock === false ? (
                  <span className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-1 text-xs font-medium">
                    MTO
                  </span>
                ) : (
                  <span className={cn(
                    "text-xs font-bold",
                    item.stock < 10 ? "text-red-500" : "text-gray-900"
                  )}>
                    {item.stock}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold font-headline text-primary tracking-tight">Inventory Management</h2>
          <p className="text-on-surface-variant text-sm font-medium">Manage your bakery products and stock levels.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          disabled={!isAdmin}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 font-bold text-sm rounded-lg shadow-md btn-smooth",
            isAdmin 
              ? "bg-brandPurple text-white hover:bg-brandPurple/90" 
              : "bg-surface-container-low text-on-surface-variant/50 cursor-not-allowed"
          )}
        >
          {isAdmin ? <Plus size={18} /> : <Lock size={18} />}
          Add New Item
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-accent-gold/20 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant/10 bg-surface-container-low/30 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={18} />
            <input 
              type="text"
              placeholder="Search items by name or category..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Total Items: {filteredItems.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-primary/5 text-[10px] font-bold text-primary uppercase tracking-[0.15em]">
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Unit Price (₹)</th>
                <th className="px-6 py-4">Stock Quantity</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 w-32 skeleton-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 skeleton-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 skeleton-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-12 skeleton-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-16 skeleton-pulse mx-auto" /></td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-50">
                      <Package size={48} className="text-on-surface-variant" />
                      <p className="text-sm font-medium text-on-surface-variant">No items found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
                  
                  return currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary-container/10 table-row-smooth group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-primary">{item.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-surface-container-low text-on-surface-variant text-[10px] font-bold rounded uppercase">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-on-surface">₹{item.price}</span>
                    </td>
                    <td className="px-6 py-4">
                      {item.maintainStock === false ? (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">
                          Made to Order
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-bold",
                            item.stock < 10 ? "text-red-500" : "text-on-surface"
                          )}>
                            {item.stock}
                          </span>
                          {item.stock < 10 && (
                            <span className="text-[8px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded uppercase">Low</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center relative">
                        <button 
                          onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                          onBlur={() => setTimeout(() => setOpenDropdownId(null), 150)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <AnimatePresence>
                          {openDropdownId === item.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-8 top-0 w-32 bg-white rounded-xl shadow-lg border border-outline-variant/10 py-2 z-10"
                            >
                              <button 
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                              >
                                View
                              </button>
                              <button 
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (isAdmin) handleOpenModal(item);
                                  setOpenDropdownId(null);
                                }}
                                disabled={!isAdmin}
                                className={cn(
                                  "w-full text-left px-4 py-2 text-sm font-medium transition-colors",
                                  isAdmin ? "text-on-surface hover:bg-surface-container-low" : "text-on-surface-variant/50 cursor-not-allowed"
                                )}
                              >
                                Edit
                              </button>
                              <button 
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (isAdmin) setIsDeleteConfirmOpen(item.id);
                                  setOpenDropdownId(null);
                                }}
                                disabled={!isAdmin}
                                className={cn(
                                  "w-full text-left px-4 py-2 text-sm font-medium transition-colors",
                                  isAdmin ? "text-red-600 hover:bg-red-50" : "text-red-600/50 cursor-not-allowed"
                                )}
                              >
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                ))
                })()
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredItems.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest">
            <div className="text-sm text-on-surface-variant">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-bold border border-outline-variant/20 rounded-md hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredItems.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredItems.length / itemsPerPage)}
                className="px-3 py-1 text-sm font-bold border border-outline-variant/20 rounded-md hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Drawer */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="drawer-backdrop"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="drawer-content"
              >
                <div className="drawer-header">
                  <h3 className="text-2xl font-semibold text-primary">
                    {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                  </h3>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="text-on-surface-variant hover:text-primary transition-colors p-2"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="drawer-body">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                      Item Name <span className="text-accent-gold">*</span>
                    </label>
                    <input 
                      required
                      className="drawer-input"
                      placeholder="e.g. Classic Blueberry Pie"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                      Category <span className="text-accent-gold">*</span>
                    </label>
                    <select 
                      required
                      className="drawer-input appearance-none"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">Select Category</option>
                      <option value="Pies">Pies</option>
                      <option value="Cookies">Cookies</option>
                      <option value="Cakes">Cakes</option>
                      <option value="Pastries">Pastries</option>
                      <option value="Beverages">Beverages</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                      Unit Price (₹) <span className="text-accent-gold">*</span>
                    </label>
                    <input 
                      required
                      type="number"
                      min="0"
                      className={cn(
                        "drawer-input",
                        Number(formData.price) < 0 ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : (formData.price !== '' ? "border-primary focus:border-primary" : "")
                      )}
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                    {Number(formData.price) < 0 && <p className="text-xs text-red-500 font-medium">Value cannot be negative.</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.maintainStock}
                        onChange={(e) => setFormData({...formData, maintainStock: e.target.checked})}
                        className="w-4 h-4 text-primary border-outline-variant/20 rounded focus:ring-primary/20"
                      />
                      <span className="text-sm font-bold text-on-surface-variant">Maintain Stock Levels?</span>
                    </label>
                  </div>

                  {formData.maintainStock && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                        Initial Stock Quantity <span className="text-accent-gold">*</span>
                      </label>
                      <input 
                        required
                        type="number"
                        min="0"
                        className={cn(
                          "drawer-input",
                          Number(formData.initialStock) < 0 ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : (formData.initialStock !== '' ? "border-primary focus:border-primary" : "")
                        )}
                        placeholder="0"
                        value={formData.initialStock}
                        onChange={(e) => setFormData({...formData, initialStock: e.target.value})}
                      />
                      {Number(formData.initialStock) < 0 && <p className="text-xs text-red-500 font-medium">Value cannot be negative.</p>}
                    </div>
                  )}
                </div>

                <div className="drawer-footer">
                  <button 
                    type="submit"
                    disabled={isSubmitting || Number(formData.price) < 0 || (formData.maintainStock && Number(formData.initialStock) < 0)}
                    className={cn(
                      "w-full py-5 bg-gradient-to-br from-primary to-[#5b1b99] text-white font-bold rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3",
                      (isSubmitting || Number(formData.price) < 0 || (formData.maintainStock && Number(formData.initialStock) < 0)) && "opacity-70 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>{editingItem ? 'Updating...' : 'Adding...'}</span>
                      </>
                    ) : (
                      <>
                        {editingItem ? <Edit2 size={20} /> : <Plus size={20} />}
                        <span>{editingItem ? 'Update Item' : 'Add Item to Inventory'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop z-[70]"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white w-full max-w-sm rounded-[16px] shadow-2xl p-8 text-center border border-primary/5"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">Confirm Delete</h3>
              <p className="text-on-surface-variant text-sm mb-8">
                Are you sure you want to remove this item from inventory? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(null)}
                  className="flex-1 py-3 bg-surface-container-low text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-high btn-smooth"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(isDeleteConfirmOpen)}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md btn-smooth"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
