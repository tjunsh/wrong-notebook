# Capacitor Android Startup Wiring Example (Offline Bootstrap)

This guide shows how to wire the offline runtime bootstrap into Capacitor Android startup.

## 1) Goal

At app startup:

1. Build/open SQLite connection
2. Load local `schema.sql` as string
3. Inject runtime via `registerMobileOfflineRuntime(...)` or run immediate bootstrap

## 2) Preferred Wiring APIs

Use from `src/offline/runtime/capacitor-runtime-bridge.ts`:

- `initializeCapacitorOfflineBridge(...)`
  - registers runtime for `OfflineBootstrap` component
- `initializeCapacitorOfflineImmediately(...)`
  - executes bootstrap now and returns owner profile id

## 3) Example (plugin-agnostic shape)

```ts
import {
  initializeCapacitorOfflineBridge,
} from '@/offline/runtime/capacitor-runtime-bridge'

async function appStartup() {
  await initializeCapacitorOfflineBridge({
    getConnection: async () => {
      // Replace with real @capacitor-community/sqlite connection object.
      // Must provide run/execute/query methods.
      return yourSqliteConnection
    },
    loadSchemaSql: async () => {
      // Option A: load from bundled asset
      // Option B: import raw string in build pipeline
      return schemaSqlString
    },
    defaultOwnerProfileId: 'local_default',
  })
}
```

## 3.1 Concrete `@capacitor-community/sqlite`-style wiring

Use helper module:

- `src/offline/runtime/capacitor-sqlite-wiring-example.ts`

Example:

```ts
import { CapacitorSQLite } from '@capacitor-community/sqlite'
import {
  setupWithCapacitorSQLiteBridge,
  setupWithCapacitorSQLiteImmediate,
} from '@/offline/runtime/capacitor-sqlite-wiring-example'

const schemaSql = '...'

await setupWithCapacitorSQLiteBridge({
  sqlite: CapacitorSQLite,
  databaseName: 'wrong_notebook_offline',
  schemaSql,
  dbVersion: 1,
  encrypted: false,
})

const result = await setupWithCapacitorSQLiteImmediate({
  sqlite: CapacitorSQLite,
  databaseName: 'wrong_notebook_offline',
  schemaSql,
})

console.log(result.ownerProfileId)
```

## 4) Immediate mode example

```ts
import {
  initializeCapacitorOfflineImmediately,
} from '@/offline/runtime/capacitor-runtime-bridge'

async function appStartup() {
  const result = await initializeCapacitorOfflineImmediately({
    getConnection: async () => yourSqliteConnection,
    loadSchemaSql: async () => schemaSqlString,
  })

  console.log('ownerProfileId', result.ownerProfileId)
}
```

## 5) Integration location

Recommended startup order:

1. Capacitor ready event
2. Build SQLite connection
3. Initialize offline bridge
4. Mount app root

`OfflineBootstrap` is already mounted in `src/components/providers.tsx`.

## 5.1 Copy-ready template file

Use template:

- `src/offline/runtime/capacitor-entry.template.ts`

Replace two functions in that file:

1. `createSqliteConnection()`
2. `loadOfflineSchemaSql()`

Then call one of:

- `setupOfflineRuntimeBridge()` for lazy bootstrap via mounted `OfflineBootstrap`
- `setupOfflineRuntimeAndBootstrapNow()` for immediate startup bootstrap

Call location recommendation:

- your Capacitor app startup entry before mounting the root UI

## 6) Validation checklist

- [ ] Startup creates default profile when first run
- [ ] Restart preserves local data
- [ ] No network required for core flows
- [ ] AI settings are owner-scoped
- [ ] AI queue can run once online
