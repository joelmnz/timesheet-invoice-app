import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import MarkdownIt from 'markdown-it';
import htmlToPdfmake from 'html-to-pdfmake';
import { db } from '../db/index.js';
import { invoices, invoiceLineItems, clients, projects, settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const md = new MarkdownIt();

const fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

export async function generateInvoicePdf(invoiceId: number): Promise<Buffer> {
  // Fetch invoice with related data
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .limit(1);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, invoice.projectId))
    .limit(1);

  const lines = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId));

  const [settingsData] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);

  // Build PDF content
  const content: Content[] = [];

  // Header - Company info
  content.push({
    text: settingsData.companyName,
    style: 'header',
    margin: [0, 0, 0, 5],
  });

  if (settingsData.companyAddress) {
    content.push({
      text: settingsData.companyAddress,
      margin: [0, 0, 0, 2],
    });
  }

  if (settingsData.companyEmail || settingsData.companyPhone) {
    const contactInfo = [
      settingsData.companyEmail,
      settingsData.companyPhone,
    ].filter(Boolean).join(' | ');
    
    content.push({
      text: contactInfo,
      margin: [0, 0, 0, 20],
    });
  }

  // Client info
  content.push({
    text: 'Bill To:',
    bold: true,
    margin: [0, 0, 0, 5],
  });

  content.push({
    text: client.name,
    margin: [0, 0, 0, 2],
  });

  if (client.address) {
    content.push({
      text: client.address,
      margin: [0, 0, 0, 15],
    });
  } else {
    content.push({ text: '', margin: [0, 0, 0, 15] });
  }

  // Invoice metadata
  content.push({
    columns: [
      {
        width: '*',
        text: [
          { text: 'Invoice Number: ', bold: true },
          invoice.number,
        ],
      },
      {
        width: '*',
        text: [
          { text: 'Invoice Date: ', bold: true },
          invoice.dateInvoiced,
        ],
      },
    ],
    margin: [0, 0, 0, 5],
  });

  content.push({
    columns: [
      {
        width: '*',
        text: [
          { text: 'Project: ', bold: true },
          project.name,
        ],
      },
      {
        width: '*',
        text: [
          { text: 'Due Date: ', bold: true },
          invoice.dueDate,
        ],
      },
    ],
    margin: [0, 0, 0, 20],
  });

  // Line items table
  const tableBody: any[] = [
    [
      { text: 'Description', bold: true },
      { text: 'Qty', bold: true, alignment: 'right' },
      { text: 'Unit Price (NZD)', bold: true, alignment: 'right' },
      { text: 'Amount (NZD)', bold: true, alignment: 'right' },
    ],
  ];

  lines.forEach((line) => {
    tableBody.push([
      line.description,
      { text: line.quantity.toFixed(2), alignment: 'right' },
      { text: line.unitPrice.toFixed(2), alignment: 'right' },
      { text: line.amount.toFixed(2), alignment: 'right' },
    ]);
  });

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto'],
      body: tableBody,
    },
    margin: [0, 0, 0, 20],
  });

  // Totals
  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 200,
        stack: [
          {
            columns: [
              { text: 'Subtotal:', alignment: 'left' },
              { text: `NZD ${invoice.subtotal.toFixed(2)}`, alignment: 'right' },
            ],
            margin: [0, 0, 0, 5],
          },
          {
            columns: [
              { text: 'Total:', bold: true, alignment: 'left' },
              { text: `NZD ${invoice.total.toFixed(2)}`, bold: true, alignment: 'right' },
            ],
          },
        ],
      },
    ],
    margin: [0, 0, 0, 20],
  });

  // Notes
  if (invoice.notes) {
    content.push({
      text: 'Notes:',
      bold: true,
      margin: [0, 0, 0, 5],
    });
    content.push({
      text: invoice.notes,
      margin: [0, 0, 0, 20],
    });
  }

  // Footer - Markdown rendered
  if (settingsData.invoiceFooterMarkdown) {
    const html = md.render(settingsData.invoiceFooterMarkdown);
    const pdfContent = htmlToPdfmake(html);
    content.push({
      text: '',
      margin: [0, 20, 0, 0],
      pageBreak: 'before',
    });
    content.push(pdfContent);
  }

  const docDefinition: TDocumentDefinitions = {
    content,
    styles: {
      header: {
        fontSize: 18,
        bold: true,
      },
    },
    defaultStyle: {
      fontSize: 10,
    },
  };

  return new Promise((resolve, reject) => {
    try {
      const printer = new PdfPrinter(fonts);
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];

      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);

      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
}
