# Sentinel's Journal

## 2025-02-17 - CSV Injection (Formula Injection)
**Vulnerability:** User-controlled data (e.g., client or project names) exported to CSV could contain spreadsheet formulas (starting with `=`, `+`, `-`, `@`) that execute when opened in Excel.
**Learning:** `generateCSV` utility did not sanitize values starting with special characters, only handling quotes and commas. This allowed potential command execution via crafted payloads.
**Prevention:** Sanitized CSV values by prepending a single quote (`'`) to any value starting with `=`, `+`, `-`, or `@`. This forces spreadsheet software to interpret the cell content as text.
