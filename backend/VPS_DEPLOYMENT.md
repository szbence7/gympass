# VPS Deployment Guide

## Architecture Overview

- **Backend**: Runs in Docker container
- **Staff-web**: Served as static files via Nginx/aaPanel
- **Mobile**: Not deployed to VPS (Expo managed)
- **Database**: PostgreSQL on VPS (aaPanel managed or Docker) with **schema-per-tenant** architecture

## Prerequisites

1. VPS with Docker installed
2. aaPanel or Nginx for reverse proxy
3. PostgreSQL installed (via aaPanel or Docker)

## Step 1: Build Backend

```bash
cd backend
npm install
npm run build
```

## Step 2: Set Up PostgreSQL

### Option A: aaPanel PostgreSQL (Recommended)

1. Install PostgreSQL via aaPanel
2. Create database: `gympass`
3. Create user: `gympass` with password
4. Grant privileges:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE gympass TO gympass;
   ```

### Option B: Docker PostgreSQL

```bash
docker run -d \
  --name gympass-postgres \
  -e POSTGRES_USER=gympass \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=gympass \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine
```

## Step 3: Configure Environment

Create `backend/.env` on VPS:

```env
DATABASE_URL=postgresql://gympass:your_password@localhost:5432/gympass
PORT=4000
NODE_ENV=production
JWT_SECRET=your-secret-key
PUBLIC_BASE_URL=https://gymgo.hu
TENANT_BASE_DOMAIN=gymgo.hu
TENANT_PROTOCOL=https
TENANT_PORT=
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
CORS_ALLOWED_ORIGINS=https://gymgo.hu,https://staff.gymgo.hu
```

## Step 4: Run Migrations

```bash
cd backend
npm run db:migrate
```

This will create the `public` schema tables. Tenant schemas are created automatically when gyms are registered.

## Step 5: Build Docker Image

```bash
cd backend
docker build -t gympass-backend .
```

## Step 6: Run Backend Container

```bash
docker run -d \
  --name gympass-backend \
  --env-file .env \
  -p 4000:4000 \
  --restart unless-stopped \
  gympass-backend
```

## Step 7: Configure Nginx/aaPanel

### Reverse Proxy for Backend

Add to Nginx config:

```nginx
location /api {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

## Step 8: Deploy Staff-Web (Static)

```bash
cd staff-web
npm install
npm run build
```

Copy `dist/` contents to aaPanel website root or Nginx static directory.

## Step 9: Health Check

```bash
curl http://localhost:4000/health
```

## PostgreSQL Schema-Per-Tenant Architecture

Each gym gets its own PostgreSQL schema:

```
Database: gympass
├── Schema: "public" (legacy/default)
│   ├── users
│   ├── passes
│   └── ...
├── Schema: "acmegym"
│   ├── users
│   ├── passes
│   └── ...
└── Schema: "hanker"
    ├── users
    ├── passes
    └── ...
```

**Benefits:**
- Complete data isolation per gym
- No `gym_id` columns needed
- Easy to backup/restore individual gyms
- Better performance (no WHERE gym_id filters)

**Schema Creation:**
- Schemas are created automatically when a gym is registered
- Migrations run automatically on first access

## Troubleshooting

- Check Docker logs: `docker logs gympass-backend`
- Verify DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure PostgreSQL is accessible from container
- Check Nginx error logs
- Verify schema exists: `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'gymslug';`

## Backup & Restore

### Backup a specific gym schema:
```bash
pg_dump -U gympass -d gympass -n gymslug > gymslug_backup.sql
```

### Restore a gym schema:
```bash
psql -U gympass -d gympass -f gymslug_backup.sql
```

