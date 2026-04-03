# Android Offline Backend Implementation Plan

## 1. Objective

Define and implement the local backend layer for the offline-first Android app:

- Local SQLite data layer
- Local domain services
- Cloud AI adapter + queue execution (OpenAI-compatible/Gemini-compatible)

Authentication baseline for offline mode:
- No server-side login dependency
- Optional local unlock only (PIN/biometric) handled on-device

Future multi-user compatibility baseline:
- owner-scoped data model via `owner_profile_id`
- local session abstraction for switching current owner context

## 2. Deliverables Added

1. Local DB schema file
   - `src/offline/db/schema.sql`

2. AI type contracts
   - `src/offline/ai/types.ts`

3. AI adapters
   - `src/offline/ai/adapters/openai-compatible-adapter.ts`
   - `src/offline/ai/adapters/gemini-compatible-adapter.ts`

4. Adapter factory
   - `src/offline/ai/adapter-factory.ts`

5. AI queue service skeleton
   - `src/offline/ai/queue-service.ts`

6. SQL client abstraction
   - `src/offline/db/sql-client.ts`

7. SQLite task repository (concrete)
   - `src/offline/ai/sqlite-task-repository.ts`

8. AI config storage service (key-value + secret abstraction)
   - `src/offline/ai/config-store.ts`

9. Queue runtime (periodic + run-now)
   - `src/offline/ai/queue-runtime.ts`

10. Database bootstrap utilities
   - `src/offline/db/bootstrap.ts`
   - `src/offline/session/constants.ts`

11. Capacitor SQLite adapter + offline init entry
   - `src/offline/db/capacitor-sqlite-client.ts`
   - `src/offline/init/offline-init.ts`

12. Startup bootstrap component (client-side)
   - `src/offline/runtime/offline-bootstrap.client.tsx`
   - wired in `src/components/providers.tsx`

13. Mobile bootstrap helper API
   - `src/offline/runtime/mobile-bootstrap.ts`

14. Capacitor runtime bridge helper
   - `src/offline/runtime/capacitor-runtime-bridge.ts`

15. Startup integration example
   - `doc/capacitor-android-startup-wiring-example.md`

16. Copy-ready entry template
   - `src/offline/runtime/capacitor-entry.template.ts`

## 3. Phase Plan

### Phase A: Data Foundation

- Execute schema migration in Capacitor SQLite bootstrap
- Implement repositories:
  - `notebook-repository`
  - `error-item-repository`
  - `tag-repository`
  - `ai-task-repository`

### Phase B: Domain Services

- Implement use cases:
  - add/edit error item
  - list/filter items
  - review record persistence
  - stats aggregation

### Phase C: AI Queue Execution

- Implement concrete `AiTaskRepository` for SQLite
- Wire `AiQueueService.runOnce()` to:
  - network-online trigger
  - app foreground periodic trigger
  - manual “retry all” action

### Phase D: Security

- Move API key storage into secure storage (Keystore-backed plugin)
- Ensure backup export excludes AI secret fields

## 4. Engineering Checklist

- [ ] schema bootstrap integrated in app init
- [x] ai-task repository concrete implementation added (`sqlite-task-repository.ts`)
- [x] queue runtime skeleton added (`queue-runtime.ts`)
- [x] AI config storage abstraction added (`config-store.ts`)
- [ ] repositories fully implemented and tested (notebook/error-item/review/stats)
- [ ] queue-service wired with app-level SQL client + network provider
- [ ] AI settings page wired to config store with secure secret implementation
- [ ] queue states reflected in UI chips and status pages

## 6. Immediate Next Steps (Execution Order)

1. Implement app-level `SqlClient` adapter (Capacitor SQLite plugin binding)
2. Execute `bootstrapOfflineDatabase(...)` on startup with `schema.sql`
3. Build repositories for notebook/error-item CRUD and review records
4. Implement concrete `KeyValueStore` + `SecretStore` using Capacitor plugins
5. Wire `AiQueueRuntime` into app lifecycle (foreground + periodic tick)
6. Connect UI actions:
   - add/edit page: save-only / save-and-analyze
   - detail page: enqueue / analyze-now
   - queue state page: retry-all / pause

## 7. Startup Wiring Contract

At app startup, mobile runtime should inject:

- `window.__OFFLINE_SQLITE_CONNECTION__`: SQLite connection object compatible with `CapacitorSQLiteConnectionLike`
- `window.__OFFLINE_SCHEMA_SQL__`: schema SQL content string

Then `OfflineBootstrap` executes `initializeOfflineApp(...)` once.

Recommended helper flow:

1. Build/open SQLite connection in Capacitor startup code
2. Load schema SQL string from bundled asset
3. Call `registerMobileOfflineRuntime({ connection, schemaSql })`
4. Let `OfflineBootstrap` run initialization automatically in Providers

If immediate initialization is preferred in startup code, call:

- `bootstrapMobileOfflineNow({ connection, schemaSql })`

## 5. Parallel Work Mode (UI + Backend)

- UI track:
  - implement screen components with mock repositories first
- Backend track:
  - implement repositories + services + queue runtime
- Integration track:
  - swap mocks with live local services
  - run end-to-end flows: create item -> enqueue AI -> process -> update detail
