const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('dummy_invoice.pdf'));

doc.fontSize(25).text('INVOICE', { align: 'center' });
doc.moveDown();
doc.fontSize(12).text('Date: 2026-03-21');
doc.text('Invoice #: 100234');
doc.moveDown();
doc.text('Bill To:');
doc.text('Acme Corp');
doc.text('123 Business Rd.');
doc.moveDown();
doc.text('Item 1: Consulting Services - $500.00');
doc.text('Item 2: Software License - $150.00');
doc.moveDown();
doc.fontSize(16).text('Total: $650.00', { align: 'right' });

doc.end();
console.log('Created dummy_invoice.pdf');
