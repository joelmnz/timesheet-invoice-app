import { DateTime } from 'luxon';

const TIMEZONE = process.env.TZ || 'Pacific/Auckland';

/**
 * Round duration up to nearest 6 minutes (0.1 hour)
 */
export function roundUpToSixMinutes(startAt: string, endAt: string): number {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const durationMinutes = Math.ceil((end - start) / 60000);
  const roundedTenths = Math.ceil(durationMinutes / 6);
  return roundedTenths / 10;
}

/**
 * Calculate default due date (20th of following month)
 */
export function calculateDueDate(invoiceDate: string): string {
  const dt = DateTime.fromISO(invoiceDate, { zone: TIMEZONE });
  const nextMonth = dt.plus({ months: 1 });
  const dueDate = nextMonth.set({ day: 20 });
  return dueDate.toISODate()!;
}

/**
 * Format invoice number with padding
 */
export function formatInvoiceNumber(num: number): string {
  return `INV-${String(num).padStart(4, '0')}`;
}

/**
 * Round to 2 decimal places
 */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Get current date in timezone
 */
export function getCurrentDate(): string {
  return DateTime.now().setZone(TIMEZONE).toISODate()!;
}

/**
 * Get current timestamp in UTC
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Calculate days overdue
 */
export function calculateDaysOverdue(dueDate: string): number {
  const due = DateTime.fromISO(dueDate, { zone: TIMEZONE });
  const today = DateTime.now().setZone(TIMEZONE);
  const diff = today.diff(due, 'days').days;
  return Math.max(0, Math.floor(diff));
}

/**
 * Get NZ tax year dates (1 April to 31 March)
 */
export function getCurrentTaxYear(): { start: string; end: string } {
  const now = DateTime.now().setZone(TIMEZONE);
  const year = now.month >= 4 ? now.year : now.year - 1;
  
  return {
    start: DateTime.fromObject({ year, month: 4, day: 1 }, { zone: TIMEZONE }).toISODate()!,
    end: DateTime.fromObject({ year: year + 1, month: 3, day: 31 }, { zone: TIMEZONE }).toISODate()!,
  };
}

/**
 * Get last N months including current month
 */
export function getLastNMonths(n: number): { start: string; end: string } {
  const now = DateTime.now().setZone(TIMEZONE);
  const start = now.minus({ months: n - 1 }).startOf('month');
  const end = now.endOf('month');
  
  return {
    start: start.toISODate()!,
    end: end.toISODate()!,
  };
}

/**
 * Aggregate and deduplicate notes from time entries
 * @param entries - Array of time entries with optional note field
 * @returns Comma-separated string of unique notes (case-insensitive deduplication)
 */
export function aggregateUniqueNotes(entries: Array<{ note?: string | null }>): string {
  const uniqueNotes = new Map<string, string>();
  
  for (const entry of entries) {
    if (entry.note && entry.note.trim()) {
      const noteKey = entry.note.trim().toLowerCase();
      if (!uniqueNotes.has(noteKey)) {
        uniqueNotes.set(noteKey, entry.note.trim());
      }
    }
  }
  
  return Array.from(uniqueNotes.values()).join(', ');
}
