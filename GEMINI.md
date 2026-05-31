# DMS: Project Overview & Engineering Standards

This document serves as the primary reference for the DMS application architecture, data models, and operational procedures.

## 1. Application Hierarchy & Data Model
The system follows a strict physical equipment hierarchy:
*   **Machine (1) → Sets (N):** A Machine can have multiple toolsets assigned to it over time, but a Set can only be assigned to **one** Machine at a time.
*   **Set (1) → Dies (N):** A Set contains multiple individual dies, but each Die belongs to exactly **one** Set.

### Database Relations (Prisma)
*   **Die:** Belongs to a `Set` via `setId`. Includes `dieId` (unique string), `size`, `casing`, and `details`.
*   **Set:** Belongs to a `Machine` via `machineId`.
*   **Machine:** Top-level production asset.

## 2. Key Features

### Universal Search
*   Search across Machines, Sets, and Dies from a single interface.
*   **Range Search:** Specifically for Dies, allows filtering by a numeric size range (e.g., 10mm to 15mm) even though sizes are stored as strings.

### Excel Bulk Import
Users can bulk-import dies using an Excel spreadsheet (`.xlsx` or `.xls`).
*   **Required Columns:** `Die ID`, `Size`, `Casing`.
*   **Optional Columns:** `Details`, `Set Name`.
*   **Logic:** If `Set Name` matches an existing set exactly, the die is automatically assigned to that set. Existing Die IDs are updated (upserted); new ones are created.

## 3. Operational Procedures

### Docker Deployment
The application is containerized using Docker Compose.
*   **Frontend:** Nginx on Port 80.
*   **Backend:** Express API on Port 5000.
*   **Database:** PostgreSQL 18 database server (running `postgres:18-alpine` container) with persistent volume (`dms-pgdata`) mapped to `/var/lib/postgresql`. The historic SQLite volume (`dms-db`) is retained at `/app/data` to facilitate automatic porting.

**Launch Command:**
```bash
docker compose up -d --build
```

**Seeding Initial Users (Production):**
```bash
docker exec -it dms-backend npx prisma db seed
```
The seed script preserves existing data by default. Use `RESET_DATABASE=true` only when an intentional destructive reset is required.
*   **Admin:** `admin` / `admin123`
*   **Viewer:** `viewer` / `viewer123`

### LAN Access (Remote Computers)
To access the app from other computers on the same network:
1.  Update `.env` root file: `VITE_API_URL="http://[SERVER_IP]:5000/api"`.
2.  Rebuild: `docker compose up -d --build`.
3.  Access via: `http://[SERVER_IP]`.

### Zero-Data-Loss Upgrades & Persistence
When pulling codebase updates from GitHub, database data is fully protected and automatically migrated:
1.  **Named Volume Mapping:** All PostgreSQL production data resides inside the named volume `dms-pgdata`. Running `git pull` or rebuilding containers leaves this volume untouched.
2.  **Auto-Migration on Boot:** The backend container's entrypoint command runs `npx prisma migrate deploy` automatically before starting the server. This safely applies schema structural updates (such as new columns/tables) to the existing database without erasing old records.
3.  **Zero-Touch SQLite Ingest:** When transitioning to PostgreSQL, the backend detects if a historical SQLite database (`/app/data/prod.db`) is present inside the old `dms-db` volume. On the very first boot, it automatically ports all users, audit logs, and equipment data into PostgreSQL 18, writing a `.migrated_to_postgres` marker to prevent duplicate runs.

**Standard Upgrade Steps:**
```bash
# Pull newest changes
git pull

# Rebuild and restart the container stack
docker compose up -d --build
```

### Manual Database Backup & Restore
For safety, operators should periodically back up their database:

*   **Export (Backup):** Creates a compressed, native binary backup of the live PostgreSQL database from the container:
    ```bash
    docker exec -t dms-postgres pg_dump -U dms_user -d dms_prod -F c > ./backup_$(date +%F).dump
    ```
*   **Import (Restore):** Restores a saved snapshot into the container, dropping existing tables cleanly beforehand:
    ```bash
    docker exec -i dms-postgres pg_restore -U dms_user -d dms_prod -c --if-exists -F c < ./backup_file.dump
    ```

## 4. UI/UX Standards
*   **Hierarchy-First Navigation:** Users should primarily navigate through the **Equipment Dashboard** (Machine → Set → Die).
*   **Inventory Management:** Master lists for all Sets and Dies are located at the bottom of the Dashboard for Admin management.
*   **Professionalism:** Maintain a clean, enterprise-grade aesthetic with clear status badges (Assigned/Unassigned) and real-time search/filtering on every management page.

## 5. Development Maintenance
*   **Prisma Client:** Always regenerate the client after schema changes using `npx prisma generate`. In Docker, ensure the backend is rebuilt without cache to synchronize the client.
*   **Authentication:** Uses hardened JWT session structures:
    *   **HttpOnly Cookie Isolation:** Access tokens reside strictly inside browser-managed, cryptographically isolated `HttpOnly`, `SameSite=Strict`, `Secure` cookies. They are completely immune to browser-side XSS malicious scripts retrieval.
    *   **Sliding Session Cookie Rotation:** The backend automatically rotates the JWT session cookie if 50% or more of its lifetime has elapsed, transparently extending the user's active session without manual client-side coding.
    *   **Immediate JWT Invalidation (Blacklisting):** Actively revokes session tokens on logout and password change using an O(1) in-memory signature blacklist. It uses a 30-second grace period on rotations to prevent race conditions with concurrent in-flight requests.

### Completed Database Migration (SQLite ➔ PostgreSQL 18)
The DMS application database tier has been successfully upgraded to **PostgreSQL 18** to support high-performance concurrency.
* **Prisma Provider:** Modified `backend/prisma/schema.prisma` to use `"postgresql"`.
* **Prisma Schema Migrations:** SQLite migrations were safely archived in `backend/prisma/migrations_sqlite`, and a clean initial PostgreSQL schema migration was applied.
* **Conditional Client Optimizations:** Wrapped SQLite WAL mode and busy timeout queries in `backend/src/lib/prisma.ts` so they only execute when SQLite databases are loaded.
* **Zero-Data-Loss Migration Service:** Built an automated migration engine (`autoMigration.ts`) to seamlessly transition existing clients' SQLite data to PostgreSQL 18 on container start.

### Real-Time Optimistic Tooling Lock System (Optimistic Leasing)
* **Design Philosophy:** Optimistic, non-blocking locking of Machine and Set resources during allocations to prevent double-booking.
* **Expiration Policy:** Locks automatically expire after 2 minutes of inactivity using native `NodeJS.Timeout` registries.
* **Synchronization Channel:** Uses low-latency Server-Sent Events (SSE) `/api/audit-logs/stream` to instantly propagate lock additions/removals to concurrent operators, displaying visual interlocks and warning overlays on the Shop Floorplan Map and sidebars.

### Native Database Snapshotting & Recovery (Admin Controls)
* **Automated Cron Jobs:** Alpine `crond` executes daily compressed dump files at 2:00 AM inside `dms-db-backup`, keeping up to 14 days of snapshots.
* **Programmatic REST Controller:** The dev routes (`backend/src/routes/devRoutes.ts`) expose endpoints for admins to trigger backups (`POST /api/database/backup`), view snapshots (`GET /api/database/backups`), prune files (`DELETE /api/database/backups/:filename`), and restore tables (`POST /api/database/restore`) with zero-downtime drop-and-rebuild safety checks.

### Multi-Namespace Integration Testing Suite
* **Testing Framework:** Jest + supertest executing complete integration tests in `backend/src/__tests__/features.test.ts`.
* **Schema Isolation Pattern:** To prevent SQLite compilation locking on concurrent writes under Windows/CI servers, tests run against discrete schema namespaces on PostgreSQL (e.g., `DATABASE_URL="...&schema=test_features"`). This creates private tables in isolated database namespaces, executes test hooks, and destroys them afterward without touching production data.

## 6. Developer Experience (DX)

### API Documentation
The backend includes interactive API documentation powered by Swagger (OpenAPI).
*   **URL:** `http://localhost:5000/api-docs`
*   **Usage:** Explore endpoints, view schemas, and test API calls directly from the browser.

### Schema Visualization
We maintain a live schema documentation using DBML and JSON Schema.
*   **DBML:** Located at `backend/prisma/dbml/schema.dbml`. This file can be pasted into [dbdiagram.io](https://dbdiagram.io) for a visual ERD.
*   **JSON Schema:** Located at `backend/prisma/json-schema/json-schema.json`. Useful for client-side validation or form generation.

### Knowledge Graph
This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
