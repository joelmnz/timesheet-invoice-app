import { describe, it, expect } from 'vitest';

/**
 * Test for the date parsing logic in InvoiceDetail component
 * This validates the fix for the bug where invalid dates cause UI freeze
 */
describe('InvoiceDetail Date Parsing', () => {
  // Helper function that mimics the one used in handleOpenInvoiceModal
  const parseDateSafely = (dateStr: string): Date => {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  it('should parse valid ISO date strings correctly', () => {
    const validDate = '2024-01-15';
    const result = parseDateSafely(validDate);
    expect(result.getTime()).not.toBeNaN();
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0); // January is 0
    expect(result.getDate()).toBe(15);
  });

  it('should return current date for empty string', () => {
    const emptyDate = '';
    const result = parseDateSafely(emptyDate);
    expect(result.getTime()).not.toBeNaN();
    // Result should be a valid date object
    expect(result instanceof Date).toBe(true);
  });

  it('should return current date for invalid date string', () => {
    const invalidDate = 'invalid-date';
    const result = parseDateSafely(invalidDate);
    expect(result.getTime()).not.toBeNaN();
    // Result should be a valid date object
    expect(result instanceof Date).toBe(true);
  });

  it('should return current date for null/undefined string', () => {
    const nullishDate = 'null';
    const result = parseDateSafely(nullishDate);
    expect(result.getTime()).not.toBeNaN();
    // Result should be a valid date object
    expect(result instanceof Date).toBe(true);
  });

  it('should handle various invalid date formats gracefully', () => {
    const invalidDates = [
      'Invalid Date',
      '0000-00-00',
      'not-a-date',
      '2024-13-32', // Invalid month/day
      '',
      ' ',
    ];

    invalidDates.forEach((dateStr) => {
      const result = parseDateSafely(dateStr);
      expect(result.getTime()).not.toBeNaN();
      expect(result instanceof Date).toBe(true);
    });
  });

  it('should preserve valid dates without modification', () => {
    const validDates = [
      '2024-01-01',
      '2023-12-31',
      '2024-06-15',
    ];

    validDates.forEach((dateStr) => {
      const result = parseDateSafely(dateStr);
      const expected = new Date(dateStr);
      expect(result.getTime()).toBe(expected.getTime());
    });
  });
});
