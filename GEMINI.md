# DMS: Project Overview & Engineering Standards

This document serves as the primary reference for the DMS (Die Management System) application architecture, data models, and operational procedures.

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
*   **Database:** SQLite stored in a persistent Docker volume (`dms-db`) at `/app/data/prod.db`.

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
1.  **Named Volume Mapping:** All production data resides inside the named volume `dms-db`. Running `git pull` or rebuilding containers leaves this volume untouched.
2.  **Auto-Migration on Boot:** The backend container's entrypoint command runs `npx prisma migrate deploy` automatically before starting the server. This safely applies schema structural updates (such as new columns/tables) to the existing database without erasing old records.

**Standard Upgrade Steps:**
```bash
# Pull newest changes
git pull

# Rebuild and restart the container stack
docker compose up -d --build
```

### Manual Database Backup & Restore
For safety, operators should periodically back up their database file:

*   **Export (Backup):** Copies the live database from the running container to the host computer:
    ```bash
    docker cp dms-backend:/app/data/prod.db ./prod_backup_$(date +%F).db
    ```
*   **Import (Restore):** Copies a saved backup file back into the container:
    ```bash
    # Restore the backup file
    docker cp ./prod_backup.db dms-backend:/app/data/prod.db

    # Restart the backend to load the restored database
    docker compose restart backend
    ```

## 4. UI/UX Standards
*   **Hierarchy-First Navigation:** Users should primarily navigate through the **Equipment Dashboard** (Machine → Set → Die).
*   **Inventory Management:** Master lists for all Sets and Dies are located at the bottom of the Dashboard for Admin management.
*   **Professionalism:** Maintain a clean, enterprise-grade aesthetic with clear status badges (Assigned/Unassigned) and real-time search/filtering on every management page.

## 5. Development Maintenance
*   **Prisma Client:** Always regenerate the client after schema changes using `npx prisma generate`. In Docker, ensure the backend is rebuilt without cache to synchronize the client.
*   **Authentication:** Uses JWT. Resetting the database or changing User IDs will invalidate existing browser sessions, requiring a re-login.

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
