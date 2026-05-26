# DMS (Die Management System)

DMS is a professional, enterprise-grade application for managing industrial tools and dies. It features a hierarchical equipment dashboard (Machine → Set → Die), universal search with numeric range filtering, and bulk Excel import capabilities.

## Quick Start Guide (Docker)

Follow these steps to launch the entire application stack.

### 1. Prerequisites
Ensure you have the following installed:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

---

### 2. Environment Setup
Before running the containers, you must create your environment file:

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and set a secure `JWT_SECRET`:
   ```env
   JWT_SECRET="your_random_secret_here"
   ```
   *Note: For local development, you can leave `VITE_API_URL` as `http://localhost:5000/api`.*

---

### 3. Launch the Application
Run the following command in the root directory:

```bash
docker compose up -d --build
```

**What this does:**
- Builds the optimized production images for Frontend and Backend.
- Creates a persistent volume for your SQLite database.
- Starts the backend and waits for it to pass health checks.
- Starts the Nginx-powered frontend on port **80**.

---

### 4. Initialize the Database (IMPORTANT)
Since the database is not included in the repository, you **must** seed the initial data to log in:

```bash
# This creates the default 'admin' and 'viewer' accounts
docker exec -it dms-backend node prisma/seed.js
```

---

### 5. Access the App
- **Frontend:** Open [http://localhost](http://localhost) in your browser.
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
- **Health Check:** [http://localhost:5000/health](http://localhost:5000/health)

---

### 6. Default Login Credentials
- **Admin:** `admin` / `admin123`
- **Viewer:** `viewer` / `viewer123`

---

### 7. Common Commands
- **View Logs:** `docker compose logs -f`
- **Stop App:** `docker compose down`
- **Stop & Delete Data:** `docker compose down -v` (Warning: this deletes your database volume)
