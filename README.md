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
timesheet-invoice-app/
  backend/    # Express API, database, migrations
  frontend/   # React app, UI, routing
```

---

## Developer Getting Started Guide

### Prerequisites

- Bun (v1+ recommended)

### 1. Clone the Repository

```bash
git clone <repo-url>
cd timesheet-invoice-app
```

### 2. Local Development Setup

Run the one-time setup command from the repo root:

```bash
bun run dev:setup
```

This does two things:

- Installs dependencies in `backend/` and `frontend/`
- Creates `backend/.env` from `backend/.env.example` if it does not already exist
- Moves a misplaced repo-root `.env` to `backend/.env` when local dev setup is missing

After that, edit `backend/.env` and set the values you want to use locally. The default example keeps local development simple and uses `admin` / `admin` unless you change it.

If you prefer to do it manually, use:

```bash
bun run dev:install
cp backend/.env.example backend/.env
```

### 3. Environment Variables

#### Local development

For local development, the backend reads environment variables from `backend/.env` because the dev server starts from the `backend/` directory.

Start from the example file already in the repo:

```bash
cp backend/.env.example backend/.env
```

Important local variables:

- `SESSION_SECRET` (required in production) - for session encryption
- `DATABASE_PATH` (optional, defaults to `./data/app.db`)
- `APP_USERNAME` and `APP_PASSWORD` (or `APP_PASSWORD_HASH`) - authentication credentials
- `ALLOWED_ORIGINS` (optional) - for production CORS configuration; comma-separated list
  - **Leave empty for same-origin deployments** (recommended - backend serves frontend)
  - **Set for cross-origin deployments** (e.g., `https://app.example.com,https://timesheet.mydomain.com`)
- `ALLOW_NO_ORIGIN_IN_DEV` (optional, defaults to `false`) - allows requests without Origin header
  - Useful in development for tools like curl and Postman
  - NOT recommended in production

See `backend/.env.example` for the full list of supported backend variables.

#### Docker Compose / production-style local runs

If you are using `docker compose`, copy the root example file instead:

```bash
cp .env.example .env
```

That root `.env` is for Docker Compose. It is separate from `backend/.env`, which is the file used by local Bun development.

If you accidentally created `.env` in the repo root while setting up local Bun development, `bun run dev:setup` will move it to `backend/.env` when `backend/.env` is missing.

#### CORS Configuration Guide

The application uses environment-aware CORS middleware:

**Production Mode:**
- Requires `Origin` header for API requests
- Only allows origins specified in `ALLOWED_ORIGINS`
- Blocks requests without Origin header (unless `ALLOW_NO_ORIGIN_IN_DEV=true`, not recommended)
- Logs blocked attempts for debugging

**Development Mode:**
- Allows `http://localhost:5173` by default
- Optionally allows requests without Origin header if `ALLOW_NO_ORIGIN_IN_DEV=true`

**Testing CORS with curl:**

```bash
# Test with valid origin (production)
curl -H "Origin: https://your-domain.com" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:8080/api/auth/login \
     -d '{"username":"admin","password":"admin"}' \
     --cookie-jar cookies.txt

# Test without origin (will fail in production unless ALLOW_NO_ORIGIN_IN_DEV=true)
curl -X GET http://localhost:8080/api/settings

# Test with invalid origin (will fail)
curl -H "Origin: https://evil.com" \
     -X GET http://localhost:8080/api/settings
```

### 4. Running the App (Development)

Use two terminals from the repo root:

```bash
bun run dev:backend
```

```bash
bun run dev:frontend
```

What happens on startup:

- The backend starts on [http://localhost:8080](http://localhost:8080)
- The frontend starts on [http://localhost:5173](http://localhost:5173)
- On first backend start, database migrations run automatically and the SQLite database is created if needed

Default local login, if you keep the example credentials:

- Username: `admin`
- Password: `admin`

### 5. Building for Production

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

### 6. Testing

The application has two test suites:

#### Backend API Tests

API integration tests using Vitest and Supertest (88 tests, ~42s):

```bash
cd backend
bun run test                    # Run all tests (sequential)
bun run test:parallel           # Run in parallel (dev/debug)
bun run test:watch              # Run with watch mode
bun test --preload ./src/tests/setup.ts src/tests/auth.test.ts
```

**Coverage:**
- Authentication and session management (16 tests)
- Client and project CRUD operations (51 tests)
- Settings management (14 tests)
- CSV import validation (5 tests)
- Invoice generation (2 tests)

See [`backend/src/tests/BACKEND_TESTS.md`](backend/src/tests/BACKEND_TESTS.md) for detailed documentation.

#### End-to-End (E2E) Tests

Full application flow tests using Playwright:

```bash
# Install Playwright browsers (first time only)
bunx playwright install chromium

# Run E2E tests (from project root)
bun run test:e2e

# Run in interactive UI mode
bun run test:e2e:ui

# Run in headed mode (see browser)
bun run test:e2e:headed

# Debug tests
bun run test:e2e:debug

# View test report
bun run test:e2e:report
```

**Coverage:**
- Authentication flows
- Client and project management (create, update, archive)
- Time tracking (manual entry, timer, editing)
- Invoice generation and calculations
- All tests use `E2E-` prefixed test data for easy identification

See [`e2e/README.md`](e2e/README.md) for detailed documentation.

### 7. Useful Scripts

- **Repo root:**
  - `bun run dev:setup` — Install dependencies and ensure local env lives at `backend/.env`
  - `bun run dev:install` — Install backend and frontend dependencies
  - `bun run dev:backend` — Start the backend dev server from the repo root
  - `bun run dev:frontend` — Start the frontend dev server from the repo root
  - `bun run test:e2e` — Run Playwright end-to-end tests

- **Backend (`backend/`):**
  - `bun run dev` — Start dev server
  - `bun run build` — Build TypeScript
  - `bun run start` — Run built server
  - `bun run db:generate` — Generate a Drizzle migration after schema changes
  - `bun run db:migrate` — Apply migrations manually

- **Frontend (`frontend/`):**
  - `bun run dev` — Start Vite dev server
  - `bun run build` — Build for production

---

## Production Deployment

The app ships with a multi-stage Dockerfile and a docker-compose.yml for production. The backend serves the built frontend from `frontend/dist` and stores SQLite database files under `/data`.

### Database Migrations

The application includes automatic database migration support:

- **First Start**: When the container starts for the first time (no database exists), migrations run automatically to create the database schema.
- **Existing Database**: If migrations are needed after an update, you'll see a prompt after login to run migrations through the UI.
- **Manual Migration**: You can trigger migrations via the UI after logging in, which will:
  - Create an automatic backup of your database
  - Run pending migrations
  - Initialize default settings

### Quick start with Docker Compose

1. Copy env file and edit secrets:

```bash
cp .env.example .env
# edit .env to set strong SESSION_SECRET and credentials
```

2. Build and run:

```bash
docker compose up -d --build
```

3. Verify:

```bash
curl -fsS http://localhost:8080/health
```

4. Default login (if not changed in .env):

- Username: `admin`
- Password: `admin`

On first login, if database migrations are needed, you'll be prompted to run them through the UI.

### Environment variables

- `APP_USERNAME` – required; default `admin`
- `APP_PASSWORD` – optional if `APP_PASSWORD_HASH` is set
- `APP_PASSWORD_HASH` – bcrypt hash alternative to APP_PASSWORD
- `SESSION_SECRET` – required; set a long random string
- `DATABASE_PATH` – default `/data/app.db`
- `ALLOWED_ORIGINS` – optional; comma-separated list of allowed CORS origins in production (e.g., `https://app.example.com,https://timesheet.mydomain.com`). 
  - If not set or empty, CORS is disabled (assumes same-origin deployment where backend serves frontend)
  - Only set if frontend is hosted on a different domain
- `ALLOW_NO_ORIGIN_IN_DEV` – optional; set to `true` to allow requests without Origin header (useful for curl/Postman in development)
  - NOT recommended in production
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
