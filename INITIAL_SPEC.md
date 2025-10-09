# Time Sheet Invoice App

Executive summary (ADHD-friendly)
- Single-user PWA to track project time/expenses and create invoices.
- Tech: React + TypeScript (frontend), Node.js + Express + TypeScript (backend), Drizzle ORM + SQLite, Chart.js, server-side PDF (pdfmake + markdown support).
- Self-hosted Docker image; non-root user for UNRAID (uid 99, gid 100). TZ via env.
- No GST, NZD only, invoice number sequence INV-0001 and configurable “next number.”
- Time: one timer at a time, no overlaps; round up to nearest 6 minutes (0.1 hr).
- Invoices: per project; include all uninvoiced time/expenses up to date; minimal PDF; editable lines; full-payment only.
- PWA: online data access only; offline only timer-view and stop; 6h running timer notification.
- CSV exports; charts for last 12 months; reports by invoice date and by paid date (no GST).

1) Functional requirements
1.1 Entities and fields
- System Settings (single row)
  - companyName (string)
  - companyAddress (multiline string)
  - companyEmail (string)
  - companyPhone (string)
  - invoiceFooterMarkdown (text) — printed at bottom of PDFs
  - nextInvoiceNumber (integer) — used to build INV-XXXX
  - createdAt, updatedAt
  - Note: Timezone enforced by TZ env var; not editable in UI.
- Client
  - id, name (required), address (text), email, contactPerson, defaultHourlyRate (decimal), notes (text), createdAt, updatedAt
- Project
  - id, clientId (required), name (required), hourlyRate (decimal, default from client), notes (text), active (bool; default true), createdAt, updatedAt
- TimeEntry
  - id, projectId (required), startAt (UTC datetime), endAt (UTC datetime nullable), totalHours (decimal; rounded to 0.1 hr), isInvoiced (bool), note (text), invoiceId (nullable), createdAt, updatedAt
- Expense
  - id, projectId (required), expenseDate (date), description (text), amount (decimal), isBillable (bool default true), isInvoiced (bool), invoiceId (nullable), createdAt, updatedAt
- Invoice
  - id, number (string “INV-XXXX”), clientId, projectId, dateInvoiced (date), dueDate (date), status (“Unpaid” | “Paid”), subtotal (decimal), total (decimal), notes (text), datePaid (date nullable), createdAt, updatedAt
- InvoiceLineItem
  - id, invoiceId, type (“time” | “expense” | “manual”), description (text), quantity (decimal; hours for time), unitPrice (decimal), amount (decimal), linkedTimeEntryId (nullable), linkedExpenseId (nullable), createdAt, updatedAt

1.2 Time tracking
- Single running timer globally. Starting a timer:
  - Validates no other running timer exists.
  - Creates TimeEntry with startAt=now (UTC), endAt=null, isInvoiced=false.
- Stopping a timer:
  - Sets endAt=now; computes duration and rounds UP to nearest 6 minutes (0.1 hr). totalHours stored as decimal (e.g., 0.5).
  - Prevent overlaps across all time entries; if overlap, reject with error including conflicting entry metadata.
- Manual time entry:
  - User can add/edit/delete entries on Project page.
  - On save, round up to nearest 6 minutes; validate no overlap.
- Overlaps policy: Always prevent; provide error and allow user to adjust times.
- Rounding formula:
  - durationMinutes = ceil((end-start)/60000)
  - roundedTenths = ceil(durationMinutes / 6)
  - totalHours = roundedTenths / 10

1.3 Expenses
- Fields as above; default isBillable=true.
- No categories, no attachments.
- isInvoiced and invoiceId set when included on invoice.

1.4 Invoicing
- Scope: Invoice is per Project (single project per invoice).
- Creation flow:
  - Default includes all uninvoiced TimeEntries with endAt <= upToDate and all billable, uninvoiced Expenses with expenseDate <= upToDate.
  - Default upToDate = today; user can change (e.g., end of last month).
  - Invoice lines:
    - Time entries: one line per entry or grouped? Default: group by day? Decision: keep simple — one line per entry with its note (if present), date, and hours; quantity = totalHours (decimal), unitPrice = project.hourlyRate, amount = qty * unitPrice.
    - Expenses: one line per expense, amount as unitPrice or amount? Use quantity=1, unitPrice=expense.amount, amount=expense.amount.
    - Manual line items allowed: user-specified description, quantity, unitPrice, amount auto calc.
  - Rate resolution: Use current project rate at invoice time for all time entries (even historic).
  - After successful creation, mark included time/expense items as isInvoiced=true and set invoiceId.
- Editing after creation:
  - User can modify line quantity, description, and amount; can remove lines.
  - If a time/expense line is removed, DO NOT auto-unmark the original item. User must manually toggle its isInvoiced or delete the item.
  - User can edit notes on invoice and dueDate.
- Due date rule: Default to the 20th of the following month from dateInvoiced; user editable.
- Numbering:
  - Sequential: “INV-XXXX”, 4 digits minimum with zero-padding; auto-expand beyond 9999.
  - nextInvoiceNumber sourced from settings; increment after use.
  - User can manually override invoice.number on an invoice.
- Payment:
  - Full payment only. User sets datePaid; status becomes Paid. No partial payments.
- Deleting invoices:
  - Allowed only if status is Unpaid. Deletion will NOT auto-unmark linked time/expenses; show warning.

1.5 Dashboard
- Uninvoiced hours per project: rows with Client Name, Project Name, Total Uninvoiced Hours (sum of rounded totalHours for isInvoiced=false).
- Unpaid/outstanding invoices: Date Invoiced, Client Name, Invoiced Amount (total), Days Overdue = max(0, today - dueDate) if status=Unpaid.
- Uninvoiced expenses per project: Client, Project, Total Amount sum of billable expenses with isInvoiced=false.
- Charts (last 12 full months, including current month):
  - Total amount invoiced per month (sum invoice.total by dateInvoiced month).
  - Total hours logged per month (sum timeEntry.totalHours by startAt month).
- Active Projects list with Start Timer button; shows current running timer if any with Stop.

1.6 Clients and Projects
- Clients: Name, Address, Default Hourly Rate, Email, Contact Person, Notes.
- Projects: Name, Client (required), Hourly Rate, Notes, Active flag.
- Project view shows time entries and expenses lists with add/edit/delete.

1.7 Reports and exports
- NZ tax year: 1 April to 31 March; default date range for reports is current tax year; user can override.
- Reports:
  - Invoices By Month: list invoices in date range with columns Date Invoiced, Client Name, Invoiced Amount; grand total at bottom.
  - Income By Month: list Paid invoices by datePaid with Date Paid, Client Name, Amount Paid (equal to invoice.total); grand total at bottom.
- CSV Exports:
  - Invoices, Time Entries, Expenses, Clients, Projects. Filter by date range where applicable.
  - CSV headers aligned to entity fields; times exported in ISO 8601 UTC.

1.8 PDF Invoices
- Minimal and clean layout:
  - Header: companyName, companyAddress, email, phone.
  - Client block: client name and address.
  - Metadata: Invoice No, Invoice Date, Due Date, Project Name.
  - Table columns: Description, Qty (hours, decimal, e.g., 0.5), Unit Price (NZD), Amount (NZD).
  - Totals: Subtotal and Total (no GST lines).
  - Notes: free text note field.
  - Footer: Render invoiceFooterMarkdown.
- Filename: <invoiceNumber>_<clientName>_<yyyy-mm-dd>.pdf

1.9 PWA behavior
- Installable PWA with manifest and icons; dark theme default with toggle and system preference sync.
- Offline policy:
  - No data browsing when offline.
  - Timer exception: The app can display the currently running timer and allow Stop.
    - If Stop occurs offline, the event is stored locally and synced to server when back online (with original stop timestamp).
    - While an offline stop is pending, the UI blocks starting a new timer.
  - Notification if a timer runs > 6 hours:
    - Uses Web Notifications; attempts periodic checks via service worker where supported; fallback to in-app banner when app is open.
    - No server push; relies on local timers/alarms where possible.
- Home screen badge shows a dot/number if a timer is running.

2) Non-functional requirements
- Single-user authenticated app; credentials provided via env vars.
- All timestamps stored in UTC; display localized to TZ (env, default Pacific/Auckland).
- Performance: dashboard queries optimized with indexes and summary SQL.
- Accessibility: keyboard navigation, color-contrast friendly dark theme.

3) Tech stack and architecture
- Backend:
  - Node.js 20+, Express, TypeScript.
  - Drizzle ORM with SQLite; drizzle-kit for migrations.
  - Validation: Zod.
  - PDF: pdfmake; Markdown -> HTML (markdown-it) -> html-to-pdfmake for footer.
  - Auth: server session cookie (express-session with SQLite-backed store or file store).
  - Security: Helmet, CORS same-origin, rate limiting, CSRF tokens.
- Frontend:
  - React + TypeScript + Vite.
  - UI library: Mantine (great dark theme, responsive, modals, tables).
  - State/data: TanStack Query (React Query).
  - Forms: React Hook Form + Zod resolver.
  - Routing: React Router.
  - Charts: Chart.js + react-chartjs-2.
  - Dates/TZ: Luxon.
  - PWA: Workbox (service worker), manifest.json.
- Packaging:
  - Single repo; backend serves API at /api and static React build.
  - Docker multi-stage build; run as non-root user uid 99, gid 100.

4) Data model (Drizzle/SQLite)
Tables (DDL sketch; actual migrations via drizzle-kit)
- settings
  - id INTEGER PRIMARY KEY CHECK (id=1)
  - companyName TEXT NOT NULL DEFAULT 'Example Company'
  - companyAddress TEXT DEFAULT ''
  - companyEmail TEXT DEFAULT ''
  - companyPhone TEXT DEFAULT ''
  - invoiceFooterMarkdown TEXT DEFAULT ''
  - nextInvoiceNumber INTEGER NOT NULL DEFAULT 1
  - createdAt TEXT NOT NULL
  - updatedAt TEXT NOT NULL
- clients
  - id INTEGER PRIMARY KEY
  - name TEXT NOT NULL
  - address TEXT
  - email TEXT
  - contactPerson TEXT
  - defaultHourlyRate REAL NOT NULL DEFAULT 0
  - notes TEXT
  - createdAt TEXT NOT NULL
  - updatedAt TEXT NOT NULL
- projects
  - id INTEGER PRIMARY KEY
  - clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE
  - name TEXT NOT NULL
  - hourlyRate REAL NOT NULL DEFAULT 0
  - notes TEXT
  - active INTEGER NOT NULL DEFAULT 1
  - createdAt TEXT NOT NULL
  - updatedAt TEXT NOT NULL
  - INDEX (clientId, active)
- time_entries
  - id INTEGER PRIMARY KEY
  - projectId INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  - startAt TEXT NOT NULL
  - endAt TEXT
  - totalHours REAL NOT NULL DEFAULT 0
  - isInvoiced INTEGER NOT NULL DEFAULT 0
  - invoiceId INTEGER REFERENCES invoices(id) ON DELETE SET NULL
  - note TEXT
  - createdAt TEXT NOT NULL
  - updatedAt TEXT NOT NULL
  - INDEX (projectId, isInvoiced)
  - INDEX (startAt)
- expenses
  - id INTEGER PRIMARY KEY
  - projectId INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  - expenseDate TEXT NOT NULL
  - description TEXT
  - amount REAL NOT NULL
  - isBillable INTEGER NOT NULL DEFAULT 1
  - isInvoiced INTEGER NOT NULL DEFAULT 0
  - invoiceId INTEGER REFERENCES invoices(id) ON DELETE SET NULL
  - createdAt TEXT NOT NULL
  - updatedAt TEXT NOT NULL
  - INDEX (projectId, isInvoiced)
  - INDEX (expenseDate)
- invoices
  - id INTEGER PRIMARY KEY
  - number TEXT UNIQUE NOT NULL
  - clientId INTEGER NOT NULL REFERENCES clients(id)
  - projectId INTEGER NOT NULL REFERENCES projects(id)
  - dateInvoiced TEXT NOT NULL
  - dueDate TEXT NOT NULL
  - status TEXT NOT NULL CHECK (status IN ('Unpaid','Paid'))
  - subtotal REAL NOT NULL
  - total REAL NOT NULL
  - notes TEXT
  - datePaid TEXT
  - createdAt TEXT NOT NULL
  - updatedAt TEXT NOT NULL
  - INDEX (dateInvoiced)
  - INDEX (status, dueDate)
- invoice_line_items
  - id INTEGER PRIMARY KEY
  - invoiceId INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE
  - type TEXT NOT NULL CHECK (type IN ('time','expense','manual'))
  - description TEXT NOT NULL
  - quantity REAL NOT NULL DEFAULT 1
  - unitPrice REAL NOT NULL DEFAULT 0
  - amount REAL NOT NULL DEFAULT 0
  - linkedTimeEntryId INTEGER REFERENCES time_entries(id) ON DELETE SET NULL
  - linkedExpenseId INTEGER REFERENCES expenses(id) ON DELETE SET NULL
  - createdAt TEXT NOT NULL
  - updatedAt TEXT NOT NULL
  - INDEX (invoiceId)

5) API design (REST, JSON)
Auth
- POST /api/auth/login
  - body: { username, password }
  - sets secure HttpOnly session cookie
- POST /api/auth/logout
- GET /api/auth/me -> { authenticated: boolean }

Settings
- GET /api/settings
- PUT /api/settings

Clients
- GET /api/clients?query=...&page=..&pageSize=..
- POST /api/clients
- GET /api/clients/:id
- PUT /api/clients/:id
- DELETE /api/clients/:id (only if no projects or cascade OK)

Projects
- GET /api/projects?active=true|false|all
- POST /api/projects
- GET /api/projects/:id
- PUT /api/projects/:id
- DELETE /api/projects/:id (only if no invoiced items? Usually disallow delete if any time/expense exists)
- POST /api/projects/:id/timer/start
- POST /api/projects/:id/timer/stop
- GET /api/projects/:id/time-entries
- POST /api/projects/:id/time-entries
- PUT /api/time-entries/:id
- DELETE /api/time-entries/:id
- GET /api/projects/:id/expenses
- POST /api/projects/:id/expenses
- PUT /api/expenses/:id
- DELETE /api/expenses/:id

Invoices
- GET /api/invoices?status=&clientId=&projectId=&from=&to=
- POST /api/projects/:id/invoices
  - body: { dateInvoiced, upToDate, notes }
  - Creates invoice for project :id including all eligible items up to upToDate.
- GET /api/invoices/:id
- PUT /api/invoices/:id
  - Allows editing number, dueDate, notes, status (Paid toggles datePaid to today if missing), datePaid edit.
- GET /api/invoices/:id/lines
- POST /api/invoices/:id/lines
- PUT /api/invoice-lines/:lineId
- DELETE /api/invoice-lines/:lineId
- GET /api/invoices/:id/pdf -> application/pdf (download)

Dashboard and Reports
- GET /api/dashboard/summary
  - returns:
    - uninvoicedHoursByProject[]
    - uninvoicedExpensesByProject[]
    - outstandingInvoices[]
- GET /api/charts/invoiced-by-month?months=12
- GET /api/charts/hours-by-month?months=12
- GET /api/reports/invoices?from=&to=
- GET /api/reports/income?from=&to=
- GET /api/export/:entity?from=&to= -> CSV (entity in [invoices,time-entries,expenses,clients,projects])

Timer offline stop support
- POST /api/projects/:id/timer/stop
  - body optionally includes clientStopAt (UTC ISO string). Server uses min(now, clientStopAt + small skew tolerance).

6) Business logic details
6.1 Due date calculation
- Given invoice date D:
  - Due = 20th of month after D’s month.
  - Example: D=2025-10-25 => Due=2025-11-20.

6.2 Invoice totals
- On invoice creation or edit:
  - amount per line = roundToCents(quantity * unitPrice) except expense lines with quantity=1, unitPrice=expense.amount.
  - subtotal = sum(line.amount where type in any)
  - total = subtotal (no GST).
  - Round to two decimals at each line and totals.

6.3 Preventing overlaps
- On add/edit of time entry (including stop timer):
  - Query for any time_entries where:
    - existing.startAt < new.endAt AND existing.endAt > new.startAt (classic overlap), excluding itself.
  - Reject with 409 Conflict and return conflicting entry summary.

6.4 Rounding display
- Show quantities in decimal hours with one decimal when aligned to 0.1; allow up to 2 decimals in UI but store 1-dec increments.

6.5 Status and overdue
- status=Unpaid by default; if datePaid is set then status=Paid.
- Overdue if status=Unpaid and today > dueDate.

6.6 Invoice number override
- On manual override, uniqueness enforced; the global nextInvoiceNumber is not decremented.

7) UI/UX flows
7.1 Navigation
- Sidebar: Dashboard, Clients, Projects, Invoices, Reports, Settings, Logout.
- Topbar: Theme toggle, current timer indicator with Stop button.

7.2 Dashboard
- Cards/lists for:
  - Uninvoiced hours per project.
  - Uninvoiced expenses per project.
  - Outstanding invoices with Days Overdue.
  - Charts: invoiced amount by month, hours by month.
  - Active Projects list with Start Timer buttons; if a timer is running, that project’s button turns into Stop.

7.3 Clients
- List with search, add/edit drawer.
- Fields as specified; default hourly rate influences new projects.

7.4 Projects
- List with filter Active/All; new project form preselect client and default rate.
- Project detail:
  - Header: Start/Stop timer, rate, client link, Active toggle.
  - Tabs:
    - Time entries: table with date, start, end, duration, notes, invoiced badge; add/edit/delete.
    - Expenses: table with date, description, amount, billable toggle, invoiced badge; add/edit/delete.
    - Invoices: list invoices for this project.
  - Create Invoice button with upToDate selector, dateInvoiced default today.

7.5 Invoices
- List with filters (status, date range).
- Detail:
  - Header with invoice number editable, date, due date, project/client, status.
  - Lines table: editable qty, unit price, description, amount; add manual line; remove line.
  - Totals box and notes.
  - Buttons: Download PDF, Mark Paid (sets datePaid), Save.

7.6 Reports
- Two tabs: Invoices By Month and Income By Month.
- Date range picker default to current tax year.
- Totals displayed; Export CSV button.

7.7 Settings
- System Settings form for company profile fields + invoiceFooterMarkdown (Markdown editor textarea), nextInvoiceNumber, read-only display of TZ (from env).
- Preview for invoice footer Markdown.

7.8 Auth
- Simple login page. Session persists; inactivity timeout configurable (default 7 days).

8) Validation and error handling
- Zod schemas for all payloads.
- Numeric fields (rates, amounts, hours) must be >= 0.
- Dates validated; prevent setting paid date before invoice date.
- If attempting to start a timer while one is running, 409 with current running entry info.
- On invoice creation, if no eligible items, 400 with message.

9) Security
- Session cookie: HttpOnly, SameSite=Lax, Secure=true when behind HTTPS.
- Session store: SQLite-based (connect-sqlite3).
- CSRF protection on state-changing routes.
- Helmet for secure headers.
- Rate limiter on auth/login.
- Input sanitization; Markdown rendered safely (sanitize HTML before html-to-pdfmake).

10) Timezone and dates
- Server uses TZ env (default Pacific/Auckland) for any human-facing date generation (e.g., defaulting invoice dates).
- Store all timestamps as UTC ISO strings in DB.
- Frontend displays and edits in local TZ derived from server TZ.

11) PWA/service worker
- Cache static assets (stale-while-revalidate).
- Network-only for API calls (no offline DB cache).
- Timer-offline queue:
  - Local storage entry: { runningEntryId, startAt, pendingStopAt? }.
  - On app load/online, if pendingStopAt exists, POST stop with clientStopAt then clear.
- Notification:
  - Request permission on first timer start.
  - Schedule local check loop in page; use service worker periodic background sync where available; fallback to banner.

12) Deployment: Docker and UNRAID
Environment variables
- NODE_ENV=production
- PORT=8080
- TZ=Pacific/Auckland
- SESSION_SECRET=change_me
- APP_USERNAME=your_username
- APP_PASSWORD=your_password OR APP_PASSWORD_HASH=bcrypt_hash (if both provided, HASH wins)
- DATABASE_PATH=/data/app.db

Dockerfile (outline)
- Multi-stage:
  - builder: node:20-alpine -> install deps, build frontend (Vite) and backend (tsc).
  - runtime: node:20-alpine
    - addgroup -g 100 users
    - adduser --system --uid 99 --ingroup users appuser
    - Copy dist and node_modules
    - Create /data; chown appuser:users
    - Run as appuser
    - EXPOSE 8080
    - CMD node dist/server/index.js

docker-compose.yml (example)
- services:
  app:
    image: yourrepo/time-invoice:latest
    container_name: time-invoice
    environment:
      - NODE_ENV=production
      - PORT=8080
      - TZ=Pacific/Auckland
      - SESSION_SECRET=supersecret
      - APP_USERNAME=admin
      - APP_PASSWORD_HASH=$2b$12$...   # recommended
      - DATABASE_PATH=/data/app.db
    volumes:
      - ./data:/data
    ports:
      - "8080:8080"
    restart: unless-stopped
    user: "99:100"

13) Implementation details and algorithms
13.1 Auth bootstrapping
- On startup: if APP_PASSWORD_HASH provided, use that; else hash APP_PASSWORD with bcrypt (rounds 12) in memory.
- Login compares with bcrypt; on success, sets session.

13.2 Timer state machine
- States: Idle | Running(timeEntryId, startAt) | SyncPendingStop(clientStopAt)
- Transitions:
  - Idle -> Running: start timer (server creates entry)
  - Running -> Idle: stop timer online (server updates entry with endAt, rounding)
  - Running -> SyncPendingStop: stop offline (store clientStopAt)
  - SyncPendingStop -> Idle: on reconnect, server accept stop with clientStopAt (clamped to now + skew tolerance of 2 minutes)

13.3 Overlap detection query
- SELECT id,startAt,endAt FROM time_entries WHERE endAt IS NOT NULL AND startAt < :newEnd AND endAt > :newStart AND id != :id LIMIT 1

13.4 Next invoice number
- On creation, within a transaction:
  - Read settings.nextInvoiceNumber FOR UPDATE (simulated via immediate transaction in SQLite).
  - Build number = “INV-” + padStart(nextInvoiceNumber, 4)
  - Increment and save settings.nextInvoiceNumber.
  - Insert invoice.

13.5 Reports SQL
- Invoices by month:
  - SELECT strftime('%Y-%m', dateInvoiced) m, SUM(total) FROM invoices WHERE dateInvoiced BETWEEN :from AND :to GROUP BY m
- Hours by month:
  - SELECT strftime('%Y-%m', startAt) m, SUM(totalHours) FROM time_entries WHERE startAt BETWEEN :from AND :to GROUP BY m

14) Acceptance criteria
Auth and settings
- Can log in using env credentials; session persists across reloads.
- Settings page updates company info, invoice footer markdown, next invoice number.
- Next invoice number used on creation; increments.

Clients & projects
- Can create client with default hourly rate; can create project with inherited rate override; can archive/activate.
- Active projects show on dashboard with Start Timer.

Time tracking
- Starting a timer while another runs returns clear error.
- Stopping a timer produces a time entry with totalHours in increments of 0.1.
- Manual time entries rounded up to nearest 6 minutes.
- Overlapping entries are rejected with conflict details.

Expenses
- Create/edit/delete expenses; billable default true.
- Uninvoiced, billable expenses appear on invoice creation.

Invoicing
- Creating an invoice for a project includes all uninvoiced time/expenses up to upToDate.
- Default due date is the 20th of next month from invoice date.
- Invoice number assigned sequentially; manual override allowed with uniqueness enforced.
- Editing: can change line qty/amount/description; removing a linked line does NOT unmark underlying item.
- Can mark invoice paid with a single date; status updates; appears in Income report.

Dashboard
- Uninvoiced hours/expenses lists accurate; Outstanding invoices include Days Overdue.
- Charts show last 12 months aggregates.

Reports & exports
- Reports default to current NZ tax year; totals accurate; export to CSV works.

PDF
- Download produces clean minimal PDF with:
  - Company header, client details, invoice meta, table with decimal hour qty, totals, notes, and markdown footer rendered.
- Filename matches spec.

PWA and notifications
- Installable. Dark theme default; toggle works and persists.
- When offline:
  - API pages error gracefully.
  - If a timer was running, the app shows it and allows Stop; stop is synced on reconnect.
- If a timer exceeds 6 hours, a local notification or in-app banner appears.

Docker/UNRAID
- Container runs as uid 99, gid 100.
- Data persisted at /data; SQLite file created and writable.
- TZ env affects date handling.

15) Open decisions made for you (can be changed)
- Invoice lines: one line per time entry (not grouped). If you prefer grouping (e.g., per day), say so and we’ll adjust.
- Session duration: 7 days inactivity timeout.
- CSV exports include headers; amounts in NZD without symbols; hours as decimals.
- No logo upload for invoices (not requested). Can be added later.


