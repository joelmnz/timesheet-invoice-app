import { DateTime } from 'luxon';

const TIMEZONE = 'Pacific/Auckland';

/**
 * Get the start date of the current NZ financial year (April 1)
 * Financial year runs from April 1 to March 31
 */
export function getFinancialYearStart(): string {
  const now = DateTime.now().setZone(TIMEZONE);
  const year = now.month >= 4 ? now.year : now.year - 1;
  
  return DateTime.fromObject({ year, month: 4, day: 1 }, { zone: TIMEZONE }).toISODate()!;
}
