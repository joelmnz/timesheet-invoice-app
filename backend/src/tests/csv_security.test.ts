import { describe, it, expect } from 'vitest';
import { generateCSV } from '../services/csv.js';

describe('CSV Security', () => {
  it('should prevent CSV injection for fields starting with =', () => {
    const headers = ['Name', 'Description'];
    const rows = [['Bad Guy', '=cmd|\' /C calc\'!A0']];
    const csv = generateCSV(headers, rows);

    // The cell content should be escaped to prevent execution
    // Typically by prepending a single quote
    const lines = csv.split('\n');
    const dataRow = lines[1];
    const cells = dataRow.split(',');

    // The second cell should be sanitized
    // It might be quoted if it contains spaces or commas, but the content inside should be safe
    // We expect it to start with a single quote if it was sanitized
    // e.g., "'=cmd|' /C calc'!A0" or "\"'=cmd|' /C calc'!A0\"" if wrapped in quotes

    // Check if the dangerous payload is neutralized
    expect(cells[1]).toContain("'=");
  });

  it('should prevent CSV injection for fields starting with +', () => {
    const headers = ['Value'];
    const rows = [['+1+2']];
    const csv = generateCSV(headers, rows);
    expect(csv).toContain("'+");
  });

  it('should prevent CSV injection for fields starting with -', () => {
    const headers = ['Value'];
    const rows = [['-1+2']];
    const csv = generateCSV(headers, rows);
    expect(csv).toContain("'-");
  });

  it('should prevent CSV injection for fields starting with @', () => {
    const headers = ['Value'];
    const rows = [['@SUM(1+1)']];
    const csv = generateCSV(headers, rows);
    expect(csv).toContain("'@");
  });
});
