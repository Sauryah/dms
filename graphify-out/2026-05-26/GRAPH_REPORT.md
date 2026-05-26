# Graph Report - dms  (2026-05-26)

## Corpus Check
- 68 files · ~35,613 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 629 nodes · 909 edges · 76 communities (60 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 22 edges
2. `logAction()` - 20 edges
3. `compilerOptions` - 17 edges
4. `compilerOptions` - 16 edges
5. `logAction()` - 15 edges
6. `compilerOptions` - 13 edges
7. `definitions` - 11 edges
8. `ToastContext` - 9 edges
9. `authenticate()` - 8 edges
10. `machine` - 8 edges

## Surprising Connections (you probably didn't know these)
- `login()` --calls--> `handleSubmit()`  [INFERRED]
  D:/PROJECT/mmmmm/backend/src/controllers/authController.ts → frontend/src/pages/LoginPage.tsx
- `fetchUsers()` --calls--> `handleDelete()`  [EXTRACTED]
  frontend/src/pages/SettingsPage.tsx → D:/PROJECT/mmmmm/frontend/src/pages/DiesPage.tsx
- `Backend Dependencies` --conceptually_related_to--> `Backend Service (Prod)`  [INFERRED]
  requirements.txt → docker-compose.yml
- `exportAuditLogs()` --calls--> `logAction()`  [INFERRED]
  D:/PROJECT/mmmmm/backend/src/controllers/auditController.ts → D:/PROJECT/mmmmm/backend/src/lib/auditLogger.ts
- `deleteDie()` --calls--> `logAction()`  [INFERRED]
  D:/PROJECT/mmmmm/backend/src/controllers/dieController.ts → D:/PROJECT/mmmmm/backend/src/lib/auditLogger.ts

## Communities (76 total, 16 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.29
Nodes (12): createDie(), deleteDie(), formatSizeString(), getDieById(), getDies(), getImportTemplate(), importDies(), parseSizeToFloat() (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (47): ActivityFeed(), AuditLog, BreadcrumbItem, Breadcrumbs(), SegmentedControlProps, SegmentedOption, Sidebar(), Skeleton() (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (18): type, type, type, properties, type, AuditLog, type, type (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (18): exportAuditLogs(), logAction(), login(), createDie(), deleteDie(), formatSizeString(), importDies(), parseSizeToFloat() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (34): author, description, devDependencies, is-thirteen, @mermaid-js/mermaid-cli, nodemon, prisma, prisma-dbml-generator (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (28): dependencies, axios, lucide-react, react, react-dom, react-router-dom, devDependencies, eslint (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (24): dependencies, bcryptjs, cors, dotenv, express, express-rate-limit, helmet, jsonwebtoken (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (17): Codebase3DGraph(), Codebase3DGraphProps, CodeLink, CodeNode, SimNode, ErrorBoundary, Props, State (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, resolveJsonModule (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (5): fetchMachine(), handleAssignSet(), fetchSet(), handleAssignDie(), handleUpdate()

### Community 15 - "Community 15"
Cohesion: 0.48
Nodes (6): main(), prisma, ensureDie(), ensureMachine(), ensureSet(), ensureUser()

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (17): 1. Application Hierarchy & Data Model, 2. Key Features, 3. Operational Procedures, 4. UI/UX Standards, 5. Development Maintenance, 6. Developer Experience (DX), API Documentation, code:bash (docker compose up -d --build) (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (5): code:js (export default defineConfig([), code:js (// eslint.config.js), Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 20 - "Community 20"
Cohesion: 0.60
Nodes (4): formatSizeString(), main(), parseSizeToFloat(), prisma

### Community 21 - "Community 21"
Cohesion: 0.83
Nodes (3): formatSizeString(), main(), parseSizeToFloat()

### Community 22 - "Community 22"
Cohesion: 0.47
Nodes (5): main(), parseSizeToFloat(), main(), parseSizeToFloat(), prisma

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (3): Backend Service (Prod), Frontend Service (Prod), Backend Dependencies

### Community 28 - "Community 28"
Cohesion: 1.00
Nodes (3): Hero Image, Bottom Layer (Solid), Top Layer (Wireframe)

### Community 60 - "Community 60"
Cohesion: 0.17
Nodes (14): Set, type, type, type, properties, type, properties, description (+6 more)

### Community 61 - "Community 61"
Cohesion: 0.18
Nodes (15): $ref, definitions, Machine, $ref, anyOf, $ref, type, auditLog (+7 more)

### Community 62 - "Community 62"
Cohesion: 0.23
Nodes (10): deleteUser(), getUsers(), login(), register(), createDieSchema, createMachineSchema, createSetSchema, loginSchema (+2 more)

### Community 63 - "Community 63"
Cohesion: 0.26
Nodes (10): assignSetToMachine(), createMachine(), deleteMachine(), getDashboardStats(), getMachineById(), getMachines(), updateMachine(), updateMachineSchema (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (12): 1. Prerequisites, 2. Environment Setup, 3. Launch the Application, 4. Initialize the Database (First Time Only), 5. Access the App, 6. Default Login Credentials, 7. Common Commands, code:bash (cp .env.example .env) (+4 more)

### Community 65 - "Community 65"
Cohesion: 0.17
Nodes (12): type, format, type, Die, properties, type, type, casing (+4 more)

### Community 66 - "Community 66"
Cohesion: 0.24
Nodes (6): universalSearch(), JWT_SECRET, authenticate(), authorize(), AuthRequest, router

### Community 67 - "Community 67"
Cohesion: 0.36
Nodes (9): assignDieToSet(), createSet(), deleteSet(), getSetById(), getSets(), updateSet(), logAction(), updateSetSchema (+1 more)

### Community 68 - "Community 68"
Cohesion: 0.22
Nodes (8): apiLimiter, authLimiter, devReindexLimiter, importLimiter, graphData, graphJsonPath, rawData, router

### Community 69 - "Community 69"
Cohesion: 0.28
Nodes (4): app, options, swaggerSpec, prismaErrorHandler()

### Community 70 - "Community 70"
Cohesion: 0.36
Nodes (4): exportAuditLogs(), getAuditLogs(), prisma, router

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (7): User, type, passwordHash, username, properties, type, type

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (7): items, type, $ref, dies, sets, items, type

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (7): role, sizeValue, default, enum, type, default, type

### Community 74 - "Community 74"
Cohesion: 0.14
Nodes (13): 1. Prerequisites, 2. Environment Setup, 3. Launch the Application, 4. Initialize the Database (IMPORTANT), 5. Access the App, 6. Default Login Credentials, 7. Common Commands, code:bash (cp .env.example .env) (+5 more)

### Community 75 - "Community 75"
Cohesion: 0.48
Nodes (5): fetchDies(), handleDelete(), handleImport(), handleSubmit(), resetForm()

## Knowledge Gaps
- **241 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+236 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LoginPage()` connect `Community 1` to `Community 3`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `handleSubmit()` connect `Community 3` to `Community 1`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _241 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06559356136820925 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.0855614973262032 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._