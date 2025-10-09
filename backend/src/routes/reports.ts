import { Router } from 'express';
import { db } from '../db/index.js';
import { 
  invoices, 
  clients, 
  projects,
  timeEntries,
  expenses 
} from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { getCurrentTaxYear } from '../utils/time.js';
import { generateCSV } from '../services/csv.js';

const router = Router();

// GET /api/reports/invoices
router.get('/invoices', requireAuth, async (req, res, next) => {
  try {
    const taxYear = getCurrentTaxYear();
    const from = (req.query.from as string) || taxYear.start;
    const to = (req.query.to as string) || taxYear.end;

    const data = await db
      .select({
        invoice: invoices,
        clientName: clients.name,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          sql`${invoices.dateInvoiced} >= ${from}`,
          sql`${invoices.dateInvoiced} <= ${to}`
        )
      )
      .orderBy(invoices.dateInvoiced);

    const total = data.reduce((sum, row) => sum + row.invoice.total, 0);

    res.json({
      data: data.map(({ invoice, clientName }) => ({
        dateInvoiced: invoice.dateInvoiced,
        invoiceNumber: invoice.number,
        clientName,
        amount: invoice.total,
      })),
      total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/income
router.get('/income', requireAuth, async (req, res, next) => {
  try {
    const taxYear = getCurrentTaxYear();
    const from = (req.query.from as string) || taxYear.start;
    const to = (req.query.to as string) || taxYear.end;

    const data = await db
      .select({
        invoice: invoices,
        clientName: clients.name,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(invoices.status, 'Paid'),
          sql`${invoices.datePaid} >= ${from}`,
          sql`${invoices.datePaid} <= ${to}`
        )
      )
      .orderBy(invoices.datePaid);

    const total = data.reduce((sum, row) => sum + row.invoice.total, 0);

    res.json({
      data: data.map(({ invoice, clientName }) => ({
        datePaid: invoice.datePaid,
        invoiceNumber: invoice.number,
        clientName,
        amountPaid: invoice.total,
      })),
      total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/export/:entity
router.get('/export/:entity', requireAuth, async (req, res, next) => {
  try {
    const { entity } = req.params;
    const from = req.query.from as string;
    const to = req.query.to as string;

    let csvContent = '';
    let filename = '';

    switch (entity) {
      case 'invoices': {
        const data = await db
          .select({
            invoice: invoices,
            clientName: clients.name,
            projectName: projects.name,
          })
          .from(invoices)
          .innerJoin(clients, eq(invoices.clientId, clients.id))
          .innerJoin(projects, eq(invoices.projectId, projects.id))
          .where(
            from && to
              ? and(
                  sql`${invoices.dateInvoiced} >= ${from}`,
                  sql`${invoices.dateInvoiced} <= ${to}`
                )
              : undefined
          )
          .orderBy(invoices.dateInvoiced);

        const headers = [
          'Invoice Number',
          'Date Invoiced',
          'Due Date',
          'Client',
          'Project',
          'Status',
          'Subtotal',
          'Total',
          'Date Paid',
        ];

        const rows = data.map(({ invoice, clientName, projectName }) => [
          invoice.number,
          invoice.dateInvoiced,
          invoice.dueDate,
          clientName,
          projectName,
          invoice.status,
          invoice.subtotal,
          invoice.total,
          invoice.datePaid || '',
        ]);

        csvContent = generateCSV(headers, rows);
        filename = 'invoices.csv';
        break;
      }

      case 'time-entries': {
        const data = await db
          .select({
            entry: timeEntries,
            projectName: projects.name,
            clientName: clients.name,
          })
          .from(timeEntries)
          .innerJoin(projects, eq(timeEntries.projectId, projects.id))
          .innerJoin(clients, eq(projects.clientId, clients.id))
          .where(
            from && to
              ? and(
                  sql`${timeEntries.startAt} >= ${from}`,
                  sql`${timeEntries.startAt} <= ${to}`
                )
              : undefined
          )
          .orderBy(timeEntries.startAt);

        const headers = [
          'Client',
          'Project',
          'Start Time (UTC)',
          'End Time (UTC)',
          'Total Hours',
          'Note',
          'Is Invoiced',
        ];

        const rows = data.map(({ entry, projectName, clientName }) => [
          clientName,
          projectName,
          entry.startAt,
          entry.endAt || '',
          entry.totalHours,
          entry.note || '',
          entry.isInvoiced ? 'Yes' : 'No',
        ]);

        csvContent = generateCSV(headers, rows);
        filename = 'time-entries.csv';
        break;
      }

      case 'expenses': {
        const data = await db
          .select({
            expense: expenses,
            projectName: projects.name,
            clientName: clients.name,
          })
          .from(expenses)
          .innerJoin(projects, eq(expenses.projectId, projects.id))
          .innerJoin(clients, eq(projects.clientId, clients.id))
          .where(
            from && to
              ? and(
                  sql`${expenses.expenseDate} >= ${from}`,
                  sql`${expenses.expenseDate} <= ${to}`
                )
              : undefined
          )
          .orderBy(expenses.expenseDate);

        const headers = [
          'Client',
          'Project',
          'Date',
          'Description',
          'Amount',
          'Is Billable',
          'Is Invoiced',
        ];

        const rows = data.map(({ expense, projectName, clientName }) => [
          clientName,
          projectName,
          expense.expenseDate,
          expense.description || '',
          expense.amount,
          expense.isBillable ? 'Yes' : 'No',
          expense.isInvoiced ? 'Yes' : 'No',
        ]);

        csvContent = generateCSV(headers, rows);
        filename = 'expenses.csv';
        break;
      }

      case 'clients': {
        const data = await db.select().from(clients).orderBy(clients.name);

        const headers = [
          'Name',
          'Email',
          'Contact Person',
          'Address',
          'Default Hourly Rate',
          'Notes',
        ];

        const rows = data.map((client) => [
          client.name,
          client.email || '',
          client.contactPerson || '',
          client.address || '',
          client.defaultHourlyRate,
          client.notes || '',
        ]);

        csvContent = generateCSV(headers, rows);
        filename = 'clients.csv';
        break;
      }

      case 'projects': {
        const data = await db
          .select({
            project: projects,
            clientName: clients.name,
          })
          .from(projects)
          .innerJoin(clients, eq(projects.clientId, clients.id))
          .orderBy(projects.name);

        const headers = [
          'Name',
          'Client',
          'Hourly Rate',
          'Active',
          'Notes',
        ];

        const rows = data.map(({ project, clientName }) => [
          project.name,
          clientName,
          project.hourlyRate,
          project.active ? 'Yes' : 'No',
          project.notes || '',
        ]);

        csvContent = generateCSV(headers, rows);
        filename = 'projects.csv';
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid entity type' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

export default router;
