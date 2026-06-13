import jsPDF from 'jspdf';

const loadImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image:", error);
    return "";
  }
};

export const generateInvoice = async (order: any) => {
  // Calculate dynamic height based on content
  let numLines = 0;
  numLines += 1; // THE PURPLE PIE
  if (order.store) numLines += 1;
  numLines += 2; // Address, Treat Receipt
  numLines += 1; // dashes
  
  numLines += 2; // Date, Guest
  numLines += 1; // dashes
  numLines += 1; // Your Indulgence Total
  numLines += 1; // dashes
  
  const items = order.items || [];
  items.forEach(() => {
     numLines += 2; // name, qty * price
  });
  
  numLines += 1; // dashes
  numLines += 1; // Subtotal
  if (order.discount && order.discount > 0) numLines += 1;
  numLines += 1; // TOTAL
  if (order.paymentMethod) numLines += 1;
  
  numLines += 1; // dashes
  
  // Footer wrapping approx lines
  const footerMsg = "From your ovens to your heart, thank you for choosing The Purple Pie. Tag us @the.purplepie to get featured. #thepurplepie";
  const words = footerMsg.split(' ');
  let currentWordLine = '';
  words.forEach(word => {
      if ((currentWordLine + word).length > 32) {
          numLines += 1;
          currentWordLine = word + ' ';
      } else {
          currentWordLine += word + ' ';
      }
  });
  if (currentWordLine.trim()) numLines += 1;
  
  numLines += 1; // dashes
  numLines += 1; // Thank You!
  
  const lineHeight = 5;
  const logoHeight = 30; // mm
  const height = numLines * lineHeight + 30 + logoHeight; // Extra margins and logo height
  
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, Math.max(height, 100)] // Print on 80mm wide receipt width
  });

  // Try fetching logo
  const logoUrl = window.location.origin + '/bw_logo.jpeg';
  const logoBase64 = await loadImageAsBase64(logoUrl);

  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  
  const charWidth = doc.getTextWidth('-');
  const receiptWidth = charWidth * 32;
  const cX = 40; // Center X for 80mm width page
  const lX = 40 - (receiptWidth / 2); // Left align offset to match the 32 char center grid
  
  let y = 15;

  if (logoBase64) {
      const logoWidth = 30; // mm
      doc.addImage(logoBase64, 'JPEG', cX - (logoWidth / 2), y, logoWidth, logoHeight);
      y += logoHeight + 5; // increment Y beyond logo
  }
  
  const addLine = (text: string, align: 'center' | 'left' = 'left', bold = false) => {
    doc.setFont('courier', bold ? 'bold' : 'normal');
    if (align === 'center') {
      doc.text(text, cX, y, { align: 'center' });
    } else {
      doc.text(text, lX, y);
    }
    y += lineHeight;
  };
  
  const formatLine = (left: string, right: string, maxLength = 32) => {
      const leftStr = String(left);
      const rightStr = String(right);
      const spaces = Math.max(0, maxLength - leftStr.length - rightStr.length);
      return leftStr + ' '.repeat(spaces) + rightStr;
  };

  addLine("THE PURPLE PIE", 'center', true);
  if (order.store) {
     addLine(order.store.toUpperCase(), 'center', true);
  }
  addLine("Tankapani Road, BBSR", 'center');
  addLine("Treat Receipt", 'center');
  addLine("--------------------------------", 'center');
  
  addLine(`Date: ${order.date || ''} ${order.time || ''}`, 'left');
  addLine(`Sweet Guest: ${order.customerName || 'Guest'}`, 'left');
  addLine("--------------------------------", 'center');
  addLine(formatLine("Your Indulgence", "Total"), 'left');
  addLine("--------------------------------", 'center');
  
  items.forEach((item: any) => {
       const nameStr = item.name.substring(0, 32); 
       addLine(nameStr, 'left');
       const qty = item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 1);
       const subtotal = (Number(item.price || 0) * Number(qty));
       addLine(formatLine(`${qty} x ${Number(item.price || 0).toFixed(2)}`, `Rs. ${Number(subtotal).toFixed(2)}`), 'left');
  });
  
  addLine("--------------------------------", 'center');
  addLine(formatLine("Subtotal", `Rs. ${Number(order.subtotal || 0).toFixed(2)}`), 'left');
  if (order.discount && order.discount > 0) {
      addLine(formatLine("Discount", `-Rs. ${Number(order.discount).toFixed(2)}`), 'left');
  }
  
  const totalAmount = order.grandTotal !== undefined ? order.grandTotal : (order.totalAmount || 0);
  addLine(formatLine("TOTAL", `Rs. ${Number(totalAmount).toFixed(2)}`), 'left', true);
  
  if (order.paymentMethod) {
      addLine(formatLine("Mode of Payment", order.paymentMethod), 'left');
  }
  
  addLine("--------------------------------", 'center');
  
  let currentLine = '';
  words.forEach(word => {
      if ((currentLine + word).length > 32) {
          addLine(currentLine.trim(), 'center');
          currentLine = word + ' ';
      } else {
          currentLine += word + ' ';
      }
  });
  if (currentLine.trim()) {
      addLine(currentLine.trim(), 'center');
  }
  
  addLine("--------------------------------", 'center');
  addLine("Thank You!", 'center');
  
  const filename = `Receipt_${order.invoiceNo || order.id}.pdf`;
  doc.save(filename);
};

