import React, { useState } from 'react';
import { Bluetooth, Loader2, AlertCircle } from 'lucide-react';

interface PrintOrderProps {
  order?: any;
}

export default function BluetoothPrinterButton({ order }: PrintOrderProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string>('');

  const generateReceiptText = () => {
    const ESC = '\x1B';
    const INIT = ESC + '@';
    const ALIGN_CENTER = ESC + 'a' + '\x01';
    const ALIGN_LEFT = ESC + 'a' + '\x00';
    const BOLD_ON = ESC + 'E' + '\x01';
    const BOLD_OFF = ESC + 'E' + '\x00';
    const NEWLINE = '\x0A';

    const formatLine = (left: string, right: string, maxLength = 32) => {
      const leftStr = String(left);
      const rightStr = String(right);
      const spaces = Math.max(0, maxLength - leftStr.length - rightStr.length);
      return leftStr + ' '.repeat(spaces) + rightStr + NEWLINE;
    };

    let receipt = INIT;
    
    // Header
    receipt += ALIGN_CENTER;
    receipt += BOLD_ON + "THE PURPLE PIE" + BOLD_OFF + NEWLINE;
    receipt += "Premium Cakes & Bakes" + NEWLINE;
    receipt += "Tax Invoice" + NEWLINE;
    receipt += "--------------------------------" + NEWLINE;
    
    // Body
    receipt += ALIGN_LEFT;
    if (order) {
        receipt += `Date: ${order.date} ${order.time}${NEWLINE}`;
        receipt += `Customer: ${order.customerName}${NEWLINE}`;
        receipt += "--------------------------------" + NEWLINE;
        receipt += formatLine("Item", "Total");
        receipt += "--------------------------------" + NEWLINE;
        
        order.items?.forEach((item: any) => {
             // Handle long item names by truncating or on separate line
             const nameStr = item.name.substring(0, 32); 
             receipt += nameStr + NEWLINE;
             receipt += formatLine(`${item.qty} x ${item.price.toFixed(2)}`, `Rs ${item.subtotal.toFixed(2)}`);
        });
        
        receipt += "--------------------------------" + NEWLINE;
        receipt += formatLine("Subtotal", `Rs ${order.subtotal.toFixed(2)}`);
        if (order.discount > 0) {
            receipt += formatLine("Discount", `-Rs ${order.discount.toFixed(2)}`);
        }
        receipt += BOLD_ON;
        receipt += formatLine("TOTAL", `Rs ${order.grandTotal.toFixed(2)}`);
        receipt += BOLD_OFF;
        if (order.paymentMethod) {
            receipt += formatLine("Payment", order.paymentMethod);
        }
    } else {
        // Hardcoded Sample Content As Requested
        receipt += "Date: 10/06/2026 10:00 AM" + NEWLINE;
        receipt += "Customer: John Doe" + NEWLINE;
        receipt += "--------------------------------" + NEWLINE;
        receipt += formatLine("Item", "Total");
        receipt += "--------------------------------" + NEWLINE;
        
        receipt += "Chocolate Truffle" + NEWLINE;
        receipt += formatLine("1 x 450.00", "Rs 450.00");
        
        receipt += "Red Velvet Cupcake" + NEWLINE;
        receipt += formatLine("2 x 100.00", "Rs 200.00");
        
        receipt += "--------------------------------" + NEWLINE;
        receipt += formatLine("Subtotal", "Rs 650.00");
        receipt += BOLD_ON;
        receipt += formatLine("TOTAL", "Rs 650.00");
        receipt += BOLD_OFF;
    }
    
    // Footer
    receipt += "--------------------------------" + NEWLINE;
    receipt += ALIGN_CENTER;
    
    // Word wrap footer message for 58mm printer (32 chars)
    const footerMsg = "Thank you for choosing The Purple Pie! We hope our freshly baked treats add a touch of sweetness to your day, and we look forward to seeing you again soon for your next favorite indulgence.";
    const words = footerMsg.split(' ');
    let currentLine = '';
    
    words.forEach(word => {
        if ((currentLine + word).length > 32) {
            receipt += currentLine.trim() + NEWLINE;
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    });
    if (currentLine.trim()) {
        receipt += currentLine.trim() + NEWLINE;
    }
    
    receipt += NEWLINE + NEWLINE + NEWLINE; // Feed extra lines
    return receipt;
  };

  const handleBluetoothPrint = async () => {
    setError('');
    setIsPrinting(true);
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported by your browser.');
      }

      // Request ANY Bluetooth device to ensure user can select thermal printer
      // Some POS generic UUIDs are common but 'acceptAllDevices' with 'optionalServices' is the most robust approach for unknown generic printers.
      const device = await navigator.bluetooth.requestDevice({
         acceptAllDevices: true,
         optionalServices: [
             '000018f0-0000-1000-8000-00805f9b34fb', // standard bluetooth printer
             'e7810a71-73ae-499d-8c15-faa9aef0c3f2', 
             '49535343-fe7d-4ae5-8fa9-9fafd205e455', // IS113
             '00001101-0000-1000-8000-00805f9b34fb'  // SPP (Serial Port Profile)
         ]
      });

      if (!device) throw new Error('No device selected.');

      device.addEventListener('gattserverdisconnected', () => {
        console.warn('Bluetooth device disconnected');
        setError('Device disconnected unexpectedly.');
      });

      if (!device.gatt) throw new Error('GATT server not available.');
      const server = await device.gatt.connect();
      if (!server) throw new Error('Failed to connect to GATT server.');

      const services = await server.getPrimaryServices();
      if (services.length === 0) throw new Error('No Bluetooth services found on device.');
      
      let writeChar: BluetoothRemoteGATTCharacteristic | null = null;
      
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse) || null;
        if (writeChar) break;
      }

      if (!writeChar) {
        throw new Error('No writable characteristic found on printer. Device might not be a supported printer.');
      }

      const receiptText = generateReceiptText();
      const encoder = new TextEncoder();
      const payload = encoder.encode(receiptText);

      // Write in chunks due to BLE limits
      const chunkSize = 100;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        if (writeChar.properties.writeWithoutResponse) {
           await writeChar.writeValueWithoutResponse(chunk);
        } else {
           await writeChar.writeValue(chunk);
        }
      }

      // Small delay then disconnect
      setTimeout(() => {
          if (device.gatt?.connected) device.gatt.disconnect();
      }, 3000);
      
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotFoundError') {
        setError('Device selection cancelled.');
      } else {
        setError(err.message || 'Failed to print. Check pairing.');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative group">
      {error && (
        <div className="absolute -top-12 left-0 right-0 p-2 text-xs bg-red-100 text-red-700 rounded shadow-sm flex items-start gap-1 z-10 w-max max-w-[200px]">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}
      <button 
        onClick={handleBluetoothPrint}
        disabled={isPrinting}
        className="w-full h-full py-4 font-bold rounded-xl transition-all border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        title="Print to Bluetooth Thermal Printer"
      >
        {isPrinting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Bluetooth size={18} />
        )}
        <span className="hidden sm:inline">Bluetooth</span>
      </button>
    </div>
  );
}
