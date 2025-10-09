# Timesheet Invoice App

A full-stack web application for tracking time, managing projects, generating invoices, and reporting for freelancers and small teams.

## Features

- User authentication and session management
- Track time entries and expenses
- Manage clients and projects
- Generate and export invoices (PDF/CSV)
- Dashboard with charts and reports
- Settings for customization

## Tech Stack

- **Frontend:** React, Mantine UI, React Router, TypeScript, Vite
- **Backend:** Express, Drizzle ORM (SQLite), TypeScript
- **Other:** PDF/CSV export, Zod validation, Luxon for date/time

## Project Structure

```text
timesheet_invoice_app/
  backend/    # Express API, database, migrations
  frontend/   # React app, UI, routing
```

---

## Developer Getting Started Guide

### Prerequisites

- Node.js (v18+ recommended)
- Bun (v1+ recommended)

### 1. Clone the Repository

```bash
git clone <repo-url>
cd timesheet_invoice_app
```

### 2. Install Dependencies

#### Backend

```bash
cd backend
bun install
```

#### Frontend

```bash
cd ../frontend
bun install
```

### 3. Database Setup (Backend)

- The backend uses SQLite and Drizzle ORM.
- To generate and migrate the database schema:

```bash
# From backend directory
bun run db:generate
bun run db:migrate
```

### 4. Environment Variables

- Backend expects at least:
  - `SESSION_SECRET` (for session encryption)
  - `DATABASE_PATH` (optional, defaults to `./data`)
- Create a `.env` file in `backend/` if needed.

### 5. Running the App (Development)

#### Backend

```bash
cd backend
bun run dev
```

#### Frontend

```bash
cd frontend
bun run dev
```

- Frontend runs on [http://localhost:5173](http://localhost:5173)
- Backend runs on [http://localhost:8080](http://localhost:8080)

### 6. Building for Production

#### Backend

```bash
cd backend
bun run build
bun run start
```

#### Frontend

```bash
cd frontend
bun run build
```

- In production, the backend serves the built frontend from `frontend/dist`.

### 7. Testing

- No explicit test scripts found. Add tests as needed.

### 8. Useful Scripts

- **Backend:**
  - `bun run db:generate` — Generate ORM schema
  - `bun run db:migrate` — Run migrations
  - `bun run dev` — Start dev server
  - `bun run build` — Build TypeScript
  - `bun run start` — Run built server

- **Frontend:**
  - `bun run dev` — Start dev server
  - `bun run build` — Build for production

---

## Contributing

Pull requests and issues are welcome! Please follow conventional commit messages and ensure code is formatted.

---

## License

[MIT] (or specify your license)
