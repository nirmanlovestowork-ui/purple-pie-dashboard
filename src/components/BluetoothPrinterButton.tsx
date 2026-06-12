import React, { useState } from 'react';
import { Bluetooth, Loader2, AlertCircle } from 'lucide-react';
import { loadImage, getImageEscPos, concatUint8Arrays } from '../utils/escpos';

// Cache the Bluetooth device so we don't ask for permission every time
let cachedPrinterDevice: BluetoothDevice | null = null;
let cachedWriteChar: BluetoothRemoteGATTCharacteristic | null = null;

let cachedLogoEscPos: Uint8Array | null = null;

interface PrintOrderProps {
  order?: any;
}

export default function BluetoothPrinterButton({ order, variant = 'default' }: PrintOrderProps & { variant?: 'default' | 'dropdown' }) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string>('');

  const generateReceiptPayload = async (): Promise<Uint8Array> => {
    const ESC = '\x1B';
    const INIT = ESC + '@';
    const ALIGN_CENTER = ESC + 'a' + '\x01';
    const ALIGN_LEFT = ESC + 'a' + '\x00';
    const BOLD_ON = ESC + 'E' + '\x01';
    const BOLD_OFF = ESC + 'E' + '\x00';
    const NEWLINE = '\x0A';

    const encoder = new TextEncoder();
    const encode = (str: string) => encoder.encode(str);

    const formatLine = (left: string, right: string, maxLength = 32) => {
      const leftStr = String(left);
      const rightStr = String(right);
      const spaces = Math.max(0, maxLength - leftStr.length - rightStr.length);
      return leftStr + ' '.repeat(spaces) + rightStr + NEWLINE;
    };

    let parts: Uint8Array[] = [];

    parts.push(encode(INIT));
    parts.push(encode(ALIGN_CENTER));
    parts.push(encode(BOLD_ON + "THE PURPLE PIE" + BOLD_OFF + NEWLINE));

    let receipt = "";
    if (order && order.store) {
      receipt += BOLD_ON + order.store.toUpperCase() + BOLD_OFF + NEWLINE;
    }
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
             const nameStr = item.name.substring(0, 32); 
             receipt += nameStr + NEWLINE;
             const qty = item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 1);
             const subtotal = (Number(item.price || 0) * Number(qty));
             receipt += formatLine(`${qty} x ${Number(item.price || 0).toFixed(2)}`, `Rs. ${Number(subtotal).toFixed(2)}`);
        });
        
        receipt += "--------------------------------" + NEWLINE;
        receipt += formatLine("Subtotal", `Rs. ${Number(order.subtotal || 0).toFixed(2)}`);
        if (order.discount > 0) {
            receipt += formatLine("Discount", `-Rs. ${Number(order.discount || 0).toFixed(2)}`);
        }
        receipt += BOLD_ON;
        const totalAmount = order.grandTotal !== undefined ? order.grandTotal : (order.totalAmount || 0);
        receipt += formatLine("TOTAL", `Rs. ${Number(totalAmount).toFixed(2)}`);
        receipt += BOLD_OFF;
        if (order.paymentMethod) {
            receipt += formatLine("Payment", order.paymentMethod);
        }
    } else {
        receipt += "Date: 10/06/2026 10:00 AM" + NEWLINE;
        receipt += "Customer: John Doe" + NEWLINE;
        receipt += "--------------------------------" + NEWLINE;
        receipt += formatLine("Item", "Total");
        receipt += "--------------------------------" + NEWLINE;
        
        receipt += "Chocolate Truffle" + NEWLINE;
        receipt += formatLine("1 x 450.00", "Rs. 450.00");
        
        receipt += "Red Velvet Cupcake" + NEWLINE;
        receipt += formatLine("2 x 100.00", "Rs. 200.00");
        
        receipt += "--------------------------------" + NEWLINE;
        receipt += formatLine("Subtotal", "Rs. 650.00");
        receipt += BOLD_ON;
        receipt += formatLine("TOTAL", "Rs. 650.00");
        receipt += BOLD_OFF;
    }
    
    receipt += "--------------------------------" + NEWLINE;
    receipt += ALIGN_CENTER;
    
    const footerMsg = "Thank you for choosing The Purple Pie! We hope our freshly baked treats add a touch of sweetness to your day.";
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
    
    receipt += NEWLINE;

    // Print Footer
    receipt += "--------------------------------" + NEWLINE;
    receipt += "Thank You!" + NEWLINE;
    
    parts.push(encode(receipt));

    parts.push(encode(NEWLINE + NEWLINE + NEWLINE)); // Feed extra lines
    
    return concatUint8Arrays(...parts);
  };

  const handleBluetoothPrint = async () => {
    if (isPrinting) return;
    setError('');
    setIsPrinting(true);
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported by your browser.');
      }

      let device = cachedPrinterDevice;

      if (!device) {
        // Request ANY Bluetooth device to ensure user can select thermal printer
        device = await navigator.bluetooth.requestDevice({
           acceptAllDevices: true,
           optionalServices: [
               '000018f0-0000-1000-8000-00805f9b34fb', // standard bluetooth printer
               'e7810a71-73ae-499d-8c15-faa9aef0c3f2', 
               '49535343-fe7d-4ae5-8fa9-9fafd205e455', // IS113
               '00001814-0000-1000-8000-00805f9b34fb', // Generic printer
               '00001101-0000-1000-8000-00805f9b34fb', // SPP (though mostly classic, sometimes used in BLE)
               '0000ff00-0000-1000-8000-00805f9b34fb', // Common thermal printer BLE
               '0000af30-0000-1000-8000-00805f9b34fb',
               '0000ae30-0000-1000-8000-00805f9b34fb'
           ]
        });

        if (!device) throw new Error('No device selected.');

        device.addEventListener('gattserverdisconnected', () => {
          console.warn('Bluetooth device disconnected');
          cachedWriteChar = null;
        });
        
        cachedPrinterDevice = device;
      }

      if (!device.gatt) throw new Error('GATT server not available.');
      
      let writeChar = cachedWriteChar;

      if (!device.gatt.connected || !writeChar) {
        // Retry mechanism for connection
        let server = null;
        let connectError = null;
        
        // Brief delay before trying to connect (helps if device was just paired)
        await new Promise(resolve => setTimeout(resolve, 500));

        for (let i = 0; i < 3; i++) {
          try {
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
            server = await device.gatt.connect();
            break;
          } catch (e: any) {
            console.warn(`Connection attempt ${i + 1} failed:`, e);
            connectError = e;
            try { if (device.gatt.connected) device.gatt.disconnect(); } catch (_) {}
          }
        }
        
        if (!server) {
          cachedPrinterDevice = null;
          cachedWriteChar = null;
          const isNetworkError = connectError?.name === 'NetworkError' || connectError?.message?.toLowerCase().includes('failed');
          const helpText = isNetworkError ? "Make sure the printer is turned on, in range, and supports Bluetooth Low Energy (BLE). Classic Bluetooth-only printers cannot connect via web browsers. If it's a dual-mode printer, make sure it is not connected to your phone's Bluetooth settings (unpair it from Android settings first), then try again here." : connectError?.message;
          throw new Error(`Failed to connect to printer. ${helpText}`);
        }

        const services = await server.getPrimaryServices();
        if (services.length === 0) throw new Error('No Bluetooth services found on device.');
        
        for (const service of services) {
          const characteristics = await service.getCharacteristics();
          // Always prefer writeWithoutResponse. Many cheap POS printers hang indefinitely waiting for an ACK if you use 'write', causing it to never print at all.
          writeChar = characteristics.find(c => c.properties.writeWithoutResponse) || 
                      characteristics.find(c => c.properties.write) || null;
          if (writeChar) break;
        }

        if (!writeChar) {
          throw new Error('No writable characteristic found on printer. Device might not be a supported printer.');
        }
        
        cachedWriteChar = writeChar;
      }

      const payload = await generateReceiptPayload();

      // Write in chunks due to BLE limits.
      // Small payloads (text only) don't overrun as easily, but BLE max is typically 512. We use 64 for maximum compatibility.
      const chunkSize = 64; 
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        
        if (writeChar.properties.writeWithoutResponse) {
           await writeChar.writeValueWithoutResponse(chunk);
           await new Promise(resolve => setTimeout(resolve, 30)); // Delay between chunks
        } else if (writeChar.properties.write) {
           await writeChar.writeValue(chunk);
        }
      }

      // We no longer disconnect the device automatically.
      // Keeping the GATT connection open speeds up subsequent prints.
      
    } catch (err: any) {
      if (err.name === 'NotFoundError' || (err.message && err.message.toLowerCase().includes('cancelled'))) {
        console.warn('Bluetooth selection cancelled by user.');
        setError('Device selection cancelled.');
      } else if (err.name === 'SecurityError' || (err.message && err.message.toLowerCase().includes('permissions policy'))) {
        setError('Bluetooth is blocked in this preview. Please click the "Open in New Tab" icon at the top right of the screen to print.');
      } else {
        console.error(err);
        cachedPrinterDevice = null;
        cachedWriteChar = null;
        setError(err.message || 'Failed to print. Check pairing.');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleBluetoothPrint();
          }}
          disabled={isPrinting}
          className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPrinting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Bluetooth size={14} />
          )}
          Print Bill (Bluetooth)
        </button>
        {error && (
          <div className="absolute right-full top-0 mr-2 p-2 text-xs bg-red-100 text-red-700 rounded shadow flex items-start gap-1 z-50 w-max max-w-[200px]">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
        )}
      </div>
    );
  }

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
