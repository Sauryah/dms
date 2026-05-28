# Tasks: Client-Side Excel, Structured Audit Filters & Interactive Timeline

- `[x]` Feature 2: Client-Side Excel Pre-Parsing & Browser Validation
  - `[x]` Install `xlsx` package inside the `frontend` folder
  - `[x]` Integrate `FileReader` and `xlsx` parsing within `DiesPage.tsx`
  - `[x]` Compute schema validations on-the-fly inside browser thread and bind to editable grid
- `[x]` Feature 3: Structured Database-Backed Audit Log Filters
  - `[x]` Upgrade `/api/audit-logs` in `auditController.ts` with filters (actor, action, date boundaries, search term)
  - `[x]` Sync `/api/audit-logs/export` inside `auditController.ts` with identical filters
  - `[x]` Build frosted slate filter control toolbar in `SettingsPage.tsx`
  - `[x]` Wire filters to trigger automated page-1 resets and paginated API fetches
- `[x]` Feature 4: Interactive Equipment Gantt Timeline & SSE
  - `[x]` Implement `/api/machines/timeline` in `timelineController.ts` (Active utilization + allocation history logs)
  - `[x]` Mount route in `timelineRoutes.ts` and register in Express server `app.ts`
  - `[x]` Construct interactive horizontal Gantt chart in `Dashboard.tsx` (Machines as lanes, Sets as floating cobalt capsules)
  - `[x]` Construct vertical allocation history timeline in `Dashboard.tsx` with real-time SSE stream prepending
- `[x]` Verification & Compilation Check
  - `[x]` Run container compilation builds via Docker Compose
  - `[x]` Verify TypeScript compile safety and correct AST synchronization
