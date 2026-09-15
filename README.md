# LuxTrack

LuxTrack is a luxury asset price-tracking and valuation platform with a Node.js/Express API, PostgreSQL persistence, and React frontend.

## Setup

### Backend

```powershell
cd backend
npm install
```

Create `backend/.env` from `backend/.env.example`. Use either `DATABASE_URL` or the `DB_*` settings, but never commit real credentials.
Set `AUTH_SECRET` to a random value of at least 32 characters.
For production password recovery, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM`. Without SMTP configuration, development
responses include a reset token for local testing; production responses never expose it.

Create the database if needed:

```powershell
psql -U postgres -h localhost -c "CREATE DATABASE luxtrack;"
```

Apply the idempotent schema migration and seed the 50 intended catalog products:

```powershell
npm run migrate
npm run seed
```

Create or rotate the admin account without putting credentials in source control:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "use-a-strong-password-at-least-6-chars"
$env:AUTH_SECRET = "use-a-random-secret-at-least-32-characters"
npm run admin:create
```

Start the API:

```powershell
npm run dev
```

The API runs on `http://localhost:5000` by default. `npm run seed:catalog` remains available as a backward-compatible alias.
The server verifies PostgreSQL before listening; if the database is unavailable, startup exits with a clear error instead of exposing a partially working API.
Use `GET /health/ready` for load balancers and uptime monitors; it returns HTTP 503 when PostgreSQL is unavailable.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` in `frontend/.env` when the backend is not running locally:

```env
VITE_API_URL=https://api.example.com/api
```

## PostgreSQL backup and restore

Create a compressed backup before migrations or deployment:

```powershell
pg_dump -U postgres -h localhost -Fc luxtrack -f luxtrack.backup
```

Restore into an existing database with:

```powershell
pg_restore -U postgres -h localhost -d luxtrack --clean --if-exists luxtrack.backup
```

The same backup can be created through the backend script (provide an optional output path):

```powershell
npm run db:backup -- luxtrack-backup.backup
```

Run `npm run migrate` after restoring only when the target schema needs newer migrations.

## Production checklist

- Set `NODE_ENV=production`, a strong `AUTH_SECRET`, `DATABASE_URL`, and `FRONTEND_URL`.
- Set `VITE_API_URL` to the deployed API URL before building the frontend.
- Configure SMTP variables for password-reset and price-alert delivery.
- Serve both applications over HTTPS.
- Restrict database access to the backend host and schedule regular backups.
- Run the included CI workflow before merging changes.
- Schedule `npm run db:backup -- C:\backups\luxtrack.backup` with Windows Task Scheduler or cron.
- Point uptime monitoring at `/health/ready`, not only `/health`.

## Database behavior

- The migration preserves the existing `assets`, `categories`, `price_history`, and related tables.
- Catalog rows use stable `luxtrack-001` through `luxtrack-050` keys.
- Re-running the seed updates those intended records without truncating unrelated products.
- Price-history writes use an exact event uniqueness index and `ON CONFLICT DO NOTHING`.
- Public asset reads remain available without a token.
- Asset writes, price updates, price reviews, and catalog seeding require an admin bearer token from `POST /api/auth/login`.
