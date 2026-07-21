import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export const exportToPDF = (transactions, title = 'Transactions Report') => {
  const doc = new jsPDF();
  doc.text(title, 14, 15);
  
  const headers = [['Date', 'Day', 'Reason', 'Amount']];
  const data = transactions.map(t => [
    new Date(t.date || t.createdAt).toLocaleDateString(),
    t.day,
    t.reason,
    `₹${t.amount}`
  ]);

  // Using simple text if autoTable is not installed to keep it lightweight, 
  // but for a real app we'd use jspdf-autotable. We'll format a basic table manually.
  let y = 30;
  doc.setFontSize(10);
  doc.text('Date', 14, y);
  doc.text('Day', 50, y);
  doc.text('Reason', 90, y);
  doc.text('Amount', 160, y);
  
  doc.line(14, y + 2, 190, y + 2);
  y += 10;
  
  data.forEach((row) => {
    doc.text(row[0], 14, y);
    doc.text(row[1], 50, y);
    doc.text(row[2], 90, y);
    doc.text(row[3], 160, y);
    y += 10;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save('transactions.pdf');
};

export const exportToExcel = (transactions, filename = 'transactions.xlsx') => {
  const data = transactions.map(t => ({
    Date: new Date(t.date || t.createdAt).toLocaleDateString(),
    Day: t.day,
    Reason: t.reason,
    Amount: t.amount
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  
  XLSX.writeFile(wb, filename);
};
