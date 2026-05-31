# DMS

DMS is a professional, enterprise-grade application for managing industrial tools and dies. It features a hierarchical equipment dashboard (Machine → Set → Die), universal search with numeric range filtering, and bulk Excel import capabilities.

---

## 🚀 Quick Start Guide (Docker)

Follow these steps to get the application running on your local machine.

### 1. Prerequisites
Ensure you have the following installed:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 2. Environment Setup
The application requires an environment file to store secrets and configuration.

1.  **Create the `.env` file:**
    ```bash
    cp .env.example .env
    ```
2.  **Configure Secrets:**
    Open the newly created `.env` file and ensure the `JWT_SECRET` is set. You can leave the defaults for local testing.

### 3. Launch the Application
Start the containers using Docker Compose. This will automatically build the images and set up the network.

```bash
docker compose up -d --build
```

**Note on Database:** Docker will automatically create a persistent volume and a new SQLite database file (`prod.db`) inside the container. You do **not** need to provide your own `.db` file.

### 4. Initialize & Seed the Database (CRITICAL)
Since the repository does not include the database file, you **must** run the seeding script to create the initial Admin and Viewer accounts.

Run this command once the containers are up:
```bash
# This creates the default 'admin' and 'viewer' accounts
docker exec -it dms-backend node prisma/seed.js
```

---

## 🔑 Access & Credentials

Once the setup is complete, you can access the app at:
- **Frontend:** [http://localhost](http://localhost)
- **API Documentation:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

### Default Login
| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Viewer** | `viewer` | `viewer123` |

---

## 🛠 Common Commands

| Action | Command |
| :--- | :--- |
| **View Logs** | `docker compose logs -f` |
| **Stop App** | `docker compose down` |
| **Wipe All Data** | `docker compose down -v` |
| **Update App** | `git pull && docker compose up -d --build` |

---

## 🔄 Zero-Data-Loss Upgrades & Database Backups

DMS is built to support risk-free, seamless updates without any data loss.

### 1. How it works:
* **Persistent Named Volumes:** All user data resides in a local named PostgreSQL Docker volume (`dms-pgdata`). Pulling codebase updates from GitHub does not affect this volume.
* **Auto-Schema Migrations:** Whenever you pull code changes and restart the container stack, the backend automatically runs `npx prisma migrate deploy` to safely apply structural table updates to your existing database.
* **Zero-Touch SQLite Ingest:** When transitioning from an older installation, the backend automatically detects any historical SQLite database (`/app/data/prod.db`), parses all historical records, and imports them seamlessly into PostgreSQL 18 on first boot.

### 2. Standard Upgrade Steps:
To pull updates and rebuild:
```bash
# Pull new changes
git pull

# Rebuild and restart the container stack
docker compose up -d --build
```

### 3. Database Backup & Restore:
DMS features an automated daily compressed backup system running at 2:00 AM (configured via the `db-backup` cron container) with a 14-day rotation policy. Administrators can also manage snapshots directly via the Settings Panel:

* **Trigger Manual Backup:** Admin Panel ➔ Settings ➔ Backups ➔ click "Create Backup" (or call `POST /api/database/backup`).
* **Restore Database:** Choose a snapshot in the Admin Panel and click "Restore" (or call `POST /api/database/restore`).

---

## 🗄️ PostgreSQL 18 Production Architecture

The DMS stack is built on high-concurrency **PostgreSQL 18** and fully containerized via Docker Compose.

* **Database Engine:** runs on `postgres:18-alpine` inside the `dms-postgres` container.
* **ORM:** Prisma Client generated and synchronized with environment schemas.
* **API Isolation:** The backend includes a dedicated unit and integration testing suite powered by Jest and supertest, utilizing dynamic PostgreSQL schema namespaces (e.g. `?schema=test`) to isolate test runs cleanly without affecting production tables.


---

## 🌐 LAN Access (Optional)
To access DMS from other computers on your local network:
1. Find your computer's local IP (e.g., `192.168.1.10`).
2. Update `VITE_API_URL` in your `.env` file to: `http://192.168.1.10:5000/api`.
3. Restart the app: `docker compose up -d --build`.

---

## 🎨 Premium Upgrades & Feature Walkthrough

For a complete breakdown of all the premium SaaS layout overhauls, 3D visualizer initialization fixes, dark-mode settings panel unification, custom user password updating features, and hover styling fixes, check out the [Development Walkthrough](walkthrough.md) in the project root!
