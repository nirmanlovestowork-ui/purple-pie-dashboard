import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoice = (order: any) => {
  const doc = new jsPDF();
  
  // Colors
  const primaryColor: [number, number, number] = [125, 0, 125]; // #7D007D
  const textColor: [number, number, number] = [55, 65, 81]; // #374151
  const mutedColor: [number, number, number] = [156, 163, 175]; // #9ca3af

  // Header: THE PURPLE PIE
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('THE PURPLE PIE', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

  // Address
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text('Bhubaneswar, Odisha', doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

  // Divider
  doc.setDrawColor(229, 231, 235); // #e5e7eb
  doc.line(14, 35, doc.internal.pageSize.getWidth() - 14, 35);

  // Order Metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  
  const startY = 45;
  const lineSpacing = 6;
  
  doc.text(`Invoice No: ${order.invoiceNo || order.id}`, 14, startY);
  doc.text(`Date: ${order.date || 'N/A'}`, 14, startY + lineSpacing);
  doc.text(`Time: ${order.time || 'N/A'}`, 14, startY + lineSpacing * 2);
  doc.text(`Customer: ${order.customerName || 'Guest'}`, 14, startY + lineSpacing * 3);

  // Table
  const tableData = (order.items || []).map((item: any) => [
    item.name || 'Unknown Item',
    item.qty || item.quantity || 1,
    `₹${Number(item.price || 0).toFixed(2)}`,
    `₹${Number((item.price || 0) * (item.qty || item.quantity || 1)).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: startY + lineSpacing * 4 + 5,
    head: [['Item Name', 'Qty', 'Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      textColor: textColor,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // #f9fafb
    },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  
  const grandTotal = order.grandTotal || order.totalAmount || 0;
  doc.text(`Grand Total: ₹${Number(grandTotal).toFixed(2)}`, doc.internal.pageSize.getWidth() - 14, finalY + 10, { align: 'right' });

  // Footer
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...mutedColor);
  doc.text('Thank you for your business! | The Purple Pie', doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

  // Export
  const filename = `Invoice_${order.invoiceNo || order.id}.pdf`;
  doc.save(filename);
};
