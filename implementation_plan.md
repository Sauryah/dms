# Implementation Plan: Client-Side Excel Parsing, Structured Audit Filters & Gantt Timeline

This plan details the implementation of three major architectural and functional features designed to elevate the DMS (Die Management System) application:
1. **Feature 2: Client-Side Excel Pre-Parsing & Browser Validation**
2. **Feature 3: Structured Database-Backed Audit Log Filters (with Filtered Export)**
3. **Feature 4: Interactive Equipment Gantt Timeline & Allocation History**

---

## User Review Required

> [!IMPORTANT]
> **Client-Side Dependency Addition:**
> We will add the standard `xlsx` (SheetJS) package to the frontend (`npm install xlsx`). This enables full browser-side spreadsheet parsing using Javascript `FileReader` binaries, eliminating unnecessary backend compute overhead for preview file uploads.

> [!TIP]
> **Database-Driven Audit Filtering:**
> We will upgrade the server-side audit logs pagination queries to support multiple, complex filters (actorName, action, date ranges, and term searches) concurrently. The custom CSV exporter will automatically receive these same filters, allowing administrators to export targeted subsets of audit data.

---

## Proposed Changes

### 1. Client-Side Excel Pre-Parsing

#### [MODIFY] [DiesPage.tsx](file:///home/sahil/Desktop/Projects/dms/frontend/src/pages/DiesPage.tsx)
* Swaps the network-bound `/api/dies/import-preview` preview calculation step for a native local browser-side parser using `FileReader` and the `xlsx` library.
* Selecting or dragging a spreadsheet parses the sheet in memory instantly on the client thread, calculates validation warnings (e.g. unrecognized Set Names) and errors (missing IDs or incorrect shapes), and mounts them straight into the editable grid modal.
* Keep `/api/dies/import-confirm` inside [dieController.ts](file:///home/sahil/Desktop/Projects/dms/backend/src/controllers/dieController.ts) to commit the finalized JSON array transactionally.

---

### 2. Structured Audit Log Filters

#### [MODIFY] [auditController.ts](file:///home/sahil/Desktop/Projects/dms/backend/src/controllers/auditController.ts)
* Update `getAuditLogs` to accept query parameters: `actor`, `action`, `startDate`, `endDate`, and `search`.
* Construct a dynamic Prisma `where` filter matching:
  * `actorName` (partial string match / contains).
  * `action` (exact match category).
  * `createdAt` (date range boundaries using `gte` and `lte`).
  * `search` (logical OR across details, target, action, actorName).
* Update `exportAuditLogs` to apply the exact same `where` filters, delivering precise CSV sheets of filtered subsets on demand.

#### [MODIFY] [SettingsPage.tsx](file:///home/sahil/Desktop/Projects/dms/frontend/src/pages/SettingsPage.tsx)
* Add a frosted, slate-colored filter toolbar directly above the audit logs grid.
* Add selectors for Actor, Action Category, Start Date, End Date, and Search, wired directly to the paginated API fetch calls.
* Selecting or changing any filter automatically resets the page to `1` and queries the updated database-driven dataset.

---

### 3. Interactive Equipment Gantt Timeline

#### [NEW] [timelineController.ts](file:///home/sahil/Desktop/Projects/dms/backend/src/controllers/timelineController.ts)
* Create a dedicated controller returning:
  1. Active machine allocations (utilization status).
  2. Step-by-step history of allocations parsed from the `AuditLog` model where `action` is one of `['ASSIGN_SET', 'ASSIGN_DIE']`, sorted descending.

#### [NEW] [timelineRoutes.ts](file:///home/sahil/Desktop/Projects/dms/backend/src/routes/timelineRoutes.ts)
* Mount `/api/machines/timeline` (authenticated, operator-accessible) to resolve timeline telemetry.

#### [MODIFY] [app.ts](file:///home/sahil/Desktop/Projects/dms/backend/src/app.ts)
* Register the new timeline routes under `/api/machines/timeline`.

#### [MODIFY] [Dashboard.tsx](file:///home/sahil/Desktop/Projects/dms/frontend/src/pages/Dashboard.tsx)
* Embed a gorgeous, horizontal **Gantt Chart (Utilization Tracker)** representing active Machines as lanes, and mounted Sets as floating blue cobalt pills with glow boundaries.
* Add a vertical **Allocation History Timeline** that renders mount and dismount steps with descriptive actor badges, action labels, and timestamps.
* Connects seamlessly with our Server-Sent Events (SSE) log stream so that any tooling allocation actions instantly slide into the visual graphs without manual refreshes!

---

## Verification Plan

### Automated Tests
- Run `npm install xlsx` in `frontend` and trigger container compilation:
  ```bash
  docker compose up -d --build
  ```
- Verify TypeScript compile integrity.

### Manual Verification
1. **Excel Ingestion:** Upload an Excel sheet, verify instant browser preview parsing in the modal with dynamic validation, edit a cell, and import cleanly.
2. **Audit Filtering:** Filter logs by `admin` and `DELETE_SET`, click Export, and ensure the downloaded CSV matches the exact filtered view.
3. **Timeline:** Mount a set to a machine on the dashboard; verify the Gantt chart and allocation timeline render the new capsule and history block instantly in real-time.
