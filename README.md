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
  - `ALLOWED_ORIGINS` (optional, for production CORS; comma-separated list)
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

## Production Deployment

The app ships with a multi-stage Dockerfile and a docker-compose.yml for production. The backend serves the built frontend from `frontend/dist` and stores SQLite database files under `/data`.

### Quick start with Docker Compose

1. Copy env file and edit secrets:

```bash
cp .env.example .env
# edit .env to set strong SESSION_SECRET and credentials
```

1. Build and run:

```bash
docker compose up -d --build
```

1. Verify:

```bash
curl -fsS http://localhost:8080/health
```

1. Default login (if not changed in .env):

- Username: `admin`
- Password: `admin`

### Environment variables

- `APP_USERNAME` – required; default `admin`
- `APP_PASSWORD` – optional if `APP_PASSWORD_HASH` is set
- `APP_PASSWORD_HASH` – bcrypt hash alternative to APP_PASSWORD
- `SESSION_SECRET` – required; set a long random string
- `DATABASE_PATH` – default `/data/app.db`
- `ALLOWED_ORIGINS` – optional; comma-separated list of allowed CORS origins in production (e.g., `https://app.example.com,https://timesheet.mydomain.com`). If not set or empty, allows all origins.
- `TZ` – container timezone (e.g., `Pacific/Auckland`)

### Data persistence

Data is stored in a Docker named volume `timesheet-data` mounted at `/data`. This includes the main SQLite database and session store.

### Unraid notes

- The image creates a non-root user with `uid 99` and `gid 100` (group `users`), matching Unraid defaults.
- In `docker-compose.yml`, the service runs with `user: "99:100"` and persists data to a volume. If you prefer a bind mount to a share, replace the volume with a path, for example:

```yaml
    volumes:
      - /mnt/user/appdata/timesheet:/data
```

Ensure the share permissions allow write access for `users` (gid 100).

### Manual Docker commands (optional)

```bash
# Build image
docker build -t timesheet-invoice-app .

# Run with named volume
docker run -d \
  --name timesheet-prod \
  -p 8080:8080 \
  -v timesheet-data:/data \
  -e APP_USERNAME=admin \
  -e APP_PASSWORD=change-me \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  -e DATABASE_PATH=/data/app.db \
  -e TZ=Pacific/Auckland \
  timesheet-invoice-app

# Health check
curl -fsS http://localhost:8080/health
```

---

## Contributing

Pull requests and issues are welcome! Please follow conventional commit messages and ensure code is formatted.

---

## License

[MIT] (or specify your license)
