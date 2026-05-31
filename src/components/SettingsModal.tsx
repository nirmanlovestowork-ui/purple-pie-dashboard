import React from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ willChange: "transform, opacity" }}
            className="relative bg-white w-[90%] md:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-primary/5 mx-auto mt-20"
          >
            <div className="p-6 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <SettingsIcon size={20} />
                <h3 className="text-xl font-bold font-headline">Settings</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <section>
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-outline-variant/10 pb-2 mb-6">
                  About
                </h4>
                <div className="space-y-2">
                  <p className="text-xs text-on-surface-variant">
                    The Purple Pie Admin Dashboard v1.0.0
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    Crafted for artisanal excellence.
                  </p>
                </div>
              </section>
            </div>

            <div className="p-6 bg-surface-container-low border-t border-outline-variant/10">
              <button 
                onClick={onClose}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
