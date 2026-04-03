# Android Offline Resume Design (Pencil UI Baseline)

## 1. Scope and Goal

Continue the existing project by completing the Android offline mainline using the previously confirmed **Pencil MCP UI baseline**.

In scope:
- Real Capacitor SQLite startup integration
- Wiring add/edit/detail actions to offline services and AI queue
- Queue status rendering and queue controls aligned to existing UI spec
- Near-release validation level with targeted automated tests

Out of scope:
- New visual redesign
- New auth model or cloud sync architecture
- Unrelated refactors

## 2. Baseline and Alignment Rules

UI baseline is fixed to previously delivered artifacts:
- `doc/android-ui-spec-handoff.md`
- `.sisyphus/ui-wireframes/*.png`

Alignment rule:
- If code conflicts with baseline, prefer changing code to match baseline behavior and status vocabulary.

## 3. Architecture Design

### 3.1 Startup Layer

Current startup mount point remains:
- `src/components/providers.tsx`
- `src/offline/runtime/offline-bootstrap.client.tsx`

Design:
- Keep `OfflineBootstrap` as the initialization trigger
- Wire real Capacitor SQLite connection + schema loading through runtime startup entry
- Provide startup dependencies by injecting:
  - `window.__OFFLINE_SQLITE_CONNECTION__`
  - `window.__OFFLINE_SCHEMA_SQL__`

Primary wiring helper already exists:
- `src/offline/runtime/capacitor-sqlite-wiring-example.ts`

### 3.2 Domain Action Layer

Design:
- Route add/edit/detail actions through offline service boundaries only
- No direct SQL or queue orchestration in page components
- Enforce owner-scoped data behavior through existing local session context

### 3.3 Queue Runtime Layer

Design:
- Keep queue runtime as single execution authority for AI tasks
- Operations:
  - enqueue from detail “Analyze now”
  - retry single
  - retry-all failed
  - pause/resume consumer
- State transitions are canonical and centralized:
  - `pending -> running -> succeeded | failed`

### 3.4 UI State Layer

Design:
- Pages consume a normalized queue/status model from service/runtime outputs
- Status chip labels and semantics must remain exactly aligned with existing UI spec vocabulary
- Queue action controls map to runtime operations, not ad-hoc component logic

## 4. Data Flow and Sequence

### 4.1 App Launch Sequence

1. Providers mount `OfflineBootstrap`
2. `OfflineBootstrap` reads window-injected sqlite connection + schema sql
3. If present, call `initializeOfflineApp`
4. Complete DB bootstrap + owner session setup
5. Expose observable startup status for UI feedback

### 4.2 Action Sequence (Add/Edit/Detail)

Add/Edit:
1. Persist local record first
2. Enqueue AI task when required by flow
3. Surface queue-linked status in UI

Detail Analyze Now:
1. Create queue task with owner scope and entity identifiers
2. Queue runtime executes and updates state
3. UI reflects live/resulting status

### 4.3 Queue Controls Sequence

- Retry: reset selected failed task to pending
- Retry-all: reset all failed tasks to pending
- Pause: stop task consumption without dropping tasks
- Resume: continue consumption from pending queue

## 5. Error Handling Design

### 5.1 Startup Errors

Cases:
- SQLite connection creation/open failure
- Schema load failure

Behavior:
- Mark offline initialization failed (observable state)
- Show baseline-defined failure state and retry action
- Retry re-runs initialization path only (no unrelated hard refresh requirement)

### 5.2 Queue Execution Errors

Behavior:
- Preserve failed task state, attempt count, and error summary
- Keep failed tasks recoverable via retry/retry-all
- Pause/resume affects consumer loop only; tasks remain durable

### 5.3 Consistency Guarantees

- Local persistence must succeed before enqueue confirmation
- If enqueue fails after save, UI must show recoverable "saved but not queued" mapped state using baseline language

## 6. Testing Design (Near-Release Level)

### 6.1 Startup Integration Tests

Required coverage:
- Successful init with valid connection + schema
- Safe behavior when connection/schema missing
- Failure state exposure on init failure
- Recovery after retry

### 6.2 Queue Workflow Tests

Required coverage:
- Analyze now creates queue task correctly
- Runtime state transitions for success/failure paths
- Retry and retry-all requeue behavior
- Pause/resume consumer behavior

### 6.3 UI Binding Tests

Required coverage:
- Status chip vocabulary mapping to queue states
- Queue control actions trigger correct service/runtime calls

## 7. Delivery Boundaries for This Iteration

Definition of done for this continuation:
- Capacitor SQLite startup integration wired into app startup path
- Add/edit/detail actions connected to offline service and queue behavior
- Queue status/control behavior visible in UI using baseline vocabulary
- Targeted automated tests for startup + queue core flow + UI bindings added and passing

## 8. Risk and Mitigation

Risk 1: Runtime integration drift between Capacitor entry and React startup
- Mitigation: keep one canonical startup wiring path and test initialization contract

Risk 2: UI vocabulary drift from Pencil baseline
- Mitigation: map from runtime states to existing baseline chip/status tokens only

Risk 3: False confidence from unit-only tests
- Mitigation: include startup integration-level tests + queue workflow tests

## 9. Implementation Approach Selection

Chosen approach: **A — layered progressive integration**

Execution order:
1. Startup layer
2. Domain actions layer
3. UI status/control bindings
4. Automated validation

Reason:
- Minimizes rework and isolates failures while preserving baseline UX fidelity.
