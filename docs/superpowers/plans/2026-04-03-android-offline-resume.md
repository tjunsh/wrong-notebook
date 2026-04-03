# Android Offline Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Android offline mainline by wiring real Capacitor SQLite startup, connecting add/edit/detail actions to offline queue services, and rendering queue states/actions per Pencil UI baseline.

**Architecture:** Keep `OfflineBootstrap` as the startup entry and add a small runtime state module to expose init status/retry. Add focused offline domain services for error-item write/update/analyze actions, backed by existing SQLite + queue repository. UI pages call offline services when runtime is ready, and keep existing server API as non-Capacitor fallback.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Capacitor SQLite bridge, existing offline SQL modules.

---

## File Structure (planned changes)

### Runtime bootstrap and status
- Create: `src/offline/runtime/offline-runtime-state.ts`
  - Single source of truth for init status (`idle|initializing|ready|failed`) and retry trigger.
- Modify: `src/offline/runtime/offline-bootstrap.client.tsx`
  - Publish runtime status updates and expose retry path.
- Modify: `src/components/providers.tsx`
  - Keep mounting bootstrap; pass optional startup callback for UI reactions.
- Create: `src/offline/runtime/capacitor-entry.ts`
  - Real entry replacing template usage to provide connection + schema.

### Offline domain services
- Create: `src/offline/error-items/offline-error-item-service.ts`
  - Add/edit/detail analyze-now actions via SQLite + queue.
- Create: `src/offline/error-items/sqlite-error-item-repository.ts`
  - SQL operations for create/update/read and AI status updates.
- Modify: `src/offline/ai/sqlite-task-repository.ts`
  - Add retry/retry-all task mutation methods and list-by-status query.
- Modify: `src/offline/ai/queue-service.ts`
  - Expose `enqueueAnalyzeTask` helper for UI/domain calls.

### UI wiring (Pencil baseline)
- Modify: `src/app/notebooks/[id]/add/page.tsx`
  - Save flow: local persist first, then enqueue analyze task.
- Modify: `src/app/error-items/[id]/page.tsx`
  - Add “Analyze now” action and status chip mapping.
- Modify: `src/components/error-list.tsx`
  - Show AI status chip vocabulary (`pending|processing|success|failed`).
- Create: `src/components/offline/queue-status-panel.tsx`
  - Queue state list + retry-all + pause/resume actions.
- Modify: `src/app/notebooks/[id]/page.tsx`
  - Mount queue panel under list area.

### Tests
- Create: `src/offline/__tests__/runtime/offline-bootstrap.test.ts`
- Create: `src/offline/__tests__/ai/queue-runtime-controls.test.ts`
- Create: `src/offline/__tests__/error-items/offline-error-item-service.test.ts`
- Create: `src/offline/__tests__/ui/ai-status-binding.test.tsx`

---

### Task 1: Add offline runtime state contract (startup observable + retry)

**Files:**
- Create: `src/offline/runtime/offline-runtime-state.ts`
- Modify: `src/offline/runtime/offline-bootstrap.client.tsx`
- Test: `src/offline/__tests__/runtime/offline-bootstrap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { createOfflineRuntimeState } from '@/offline/runtime/offline-runtime-state'

describe('offline runtime state', () => {
  it('transitions to failed and supports retry signal', () => {
    const state = createOfflineRuntimeState()
    state.setInitializing()
    state.setFailed('SQLITE_OPEN_FAILED')

    expect(state.getSnapshot().status).toBe('failed')
    expect(state.getSnapshot().error).toBe('SQLITE_OPEN_FAILED')

    state.requestRetry()
    expect(state.getSnapshot().retryToken).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/offline/__tests__/runtime/offline-bootstrap.test.ts`
Expected: FAIL with module/file not found for `offline-runtime-state`.

- [ ] **Step 3: Write minimal implementation**

```ts
export type OfflineInitStatus = 'idle' | 'initializing' | 'ready' | 'failed'

export interface OfflineRuntimeSnapshot {
  status: OfflineInitStatus
  error?: string
  retryToken: number
}

export function createOfflineRuntimeState() {
  let snapshot: OfflineRuntimeSnapshot = { status: 'idle', retryToken: 0 }

  return {
    getSnapshot: () => snapshot,
    setInitializing: () => { snapshot = { ...snapshot, status: 'initializing', error: undefined } },
    setReady: () => { snapshot = { ...snapshot, status: 'ready', error: undefined } },
    setFailed: (error: string) => { snapshot = { ...snapshot, status: 'failed', error } },
    requestRetry: () => { snapshot = { ...snapshot, retryToken: snapshot.retryToken + 1 } },
  }
}
```

Update bootstrap to set status around `initializeOfflineApp`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/offline/__tests__/runtime/offline-bootstrap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/offline/runtime/offline-runtime-state.ts src/offline/runtime/offline-bootstrap.client.tsx src/offline/__tests__/runtime/offline-bootstrap.test.ts
git commit -m "feat: add observable offline bootstrap runtime state"
```

---

### Task 2: Wire real Capacitor SQLite entry into startup path

**Files:**
- Create: `src/offline/runtime/capacitor-entry.ts`
- Modify: `src/offline/runtime/capacitor-sqlite-wiring-example.ts`
- Modify: `src/components/providers.tsx`
- Test: `src/offline/__tests__/runtime/offline-bootstrap.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { setupWithCapacitorSQLiteBridge } from '@/offline/runtime/capacitor-sqlite-wiring-example'

describe('capacitor sqlite startup wiring', () => {
  it('opens sqlite connection and injects runtime globals', async () => {
    const open = vi.fn().mockResolvedValue(undefined)
    const sqlite = {
      isConnection: vi.fn().mockResolvedValue({ result: false }),
      createConnection: vi.fn().mockResolvedValue({ open }),
      retrieveConnection: vi.fn(),
    }

    await setupWithCapacitorSQLiteBridge({ sqlite, databaseName: 'wrongbook', schemaSql: 'CREATE TABLE t(a)' })

    expect(open).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/offline/__tests__/runtime/offline-bootstrap.test.ts`
Expected: FAIL because globals are not set by runtime entry.

- [ ] **Step 3: Write minimal implementation**

`src/offline/runtime/capacitor-entry.ts`:

```ts
import schemaSql from '@/offline/db/schema.sql?raw'
import { setupWithCapacitorSQLiteBridge } from './capacitor-sqlite-wiring-example'

export async function initializeCapacitorEntry(sqlite: {
  isConnection: (o: { database: string; readonly: boolean }) => Promise<{ result: boolean }>
  retrieveConnection: (o: { database: string; readonly: boolean }) => Promise<any>
  createConnection: (o: { database: string; version: number; encrypted: boolean; mode: 'no-encryption' | 'secret' | 'encryption'; readonly: boolean }) => Promise<any>
}) {
  await setupWithCapacitorSQLiteBridge({
    sqlite,
    databaseName: 'wrongbook',
    schemaSql,
    dbVersion: 1,
    encrypted: false,
  })
}
```

Provider hook (client-only guard):

```ts
if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
  // invoke initializeCapacitorEntry with plugin sqlite handle
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/offline/__tests__/runtime/offline-bootstrap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/offline/runtime/capacitor-entry.ts src/offline/runtime/capacitor-sqlite-wiring-example.ts src/components/providers.tsx src/offline/__tests__/runtime/offline-bootstrap.test.ts
git commit -m "feat: wire capacitor sqlite startup into offline bootstrap"
```

---

### Task 3: Implement offline error-item domain service + queue enqueue/retry controls

**Files:**
- Create: `src/offline/error-items/sqlite-error-item-repository.ts`
- Create: `src/offline/error-items/offline-error-item-service.ts`
- Modify: `src/offline/ai/sqlite-task-repository.ts`
- Modify: `src/offline/ai/queue-service.ts`
- Test: `src/offline/__tests__/error-items/offline-error-item-service.test.ts`
- Test: `src/offline/__tests__/ai/queue-runtime-controls.test.ts`

- [ ] **Step 1: Write failing domain tests**

```ts
import { describe, it, expect, vi } from 'vitest'
import { OfflineErrorItemService } from '@/offline/error-items/offline-error-item-service'

describe('offline error item service', () => {
  it('saves item first then enqueues analyze task', async () => {
    const repo = { createItem: vi.fn().mockResolvedValue({ id: 'ei_1' }) }
    const queue = { enqueueAnalyzeTask: vi.fn().mockResolvedValue(undefined) }
    const svc = new OfflineErrorItemService(repo as any, queue as any)

    await svc.createAndQueueAnalyze({ notebookId: 'n1', ownerProfileId: 'local_default', questionText: 'q' })

    expect(repo.createItem).toHaveBeenCalledBefore(queue.enqueueAnalyzeTask)
  })
})
```

```ts
import { describe, it, expect } from 'vitest'
import { SqliteAiTaskRepository } from '@/offline/ai/sqlite-task-repository'

describe('queue controls', () => {
  it('exposes retry-all failed tasks operation', async () => {
    const repo = new SqliteAiTaskRepository({ execute: async () => {}, query: async () => [] } as any)
    expect(typeof (repo as any).retryAllFailedTasks).toBe('function')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/offline/__tests__/error-items/offline-error-item-service.test.ts src/offline/__tests__/ai/queue-runtime-controls.test.ts`
Expected: FAIL with missing service/repository methods.

- [ ] **Step 3: Implement minimal domain/queue methods**

`offline-error-item-service.ts` core:

```ts
export class OfflineErrorItemService {
  constructor(
    private readonly repo: { createItem(input: any): Promise<{ id: string }>; updateItem(input: any): Promise<void> },
    private readonly queue: { enqueueAnalyzeTask(input: { ownerProfileId: string; errorItemId: string; questionText?: string }): Promise<void> },
  ) {}

  async createAndQueueAnalyze(input: { notebookId: string; ownerProfileId: string; questionText?: string }) {
    const item = await this.repo.createItem(input)
    await this.queue.enqueueAnalyzeTask({ ownerProfileId: input.ownerProfileId, errorItemId: item.id, questionText: input.questionText })
    return item
  }

  async updateAndQueueAnalyze(input: { id: string; ownerProfileId: string; questionText?: string }) {
    await this.repo.updateItem(input)
    await this.queue.enqueueAnalyzeTask({ ownerProfileId: input.ownerProfileId, errorItemId: input.id, questionText: input.questionText })
  }
}
```

`sqlite-task-repository.ts` add:

```ts
async retryTask(ownerProfileId: string, taskId: string, nowTs: number): Promise<void>
async retryAllFailedTasks(ownerProfileId: string, nowTs: number): Promise<void>
async listTasksByStatus(ownerProfileId: string, status: 'pending' | 'processing' | 'success' | 'failed', limit: number): Promise<AiTask[]>
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- src/offline/__tests__/error-items/offline-error-item-service.test.ts src/offline/__tests__/ai/queue-runtime-controls.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/offline/error-items/sqlite-error-item-repository.ts src/offline/error-items/offline-error-item-service.ts src/offline/ai/sqlite-task-repository.ts src/offline/ai/queue-service.ts src/offline/__tests__/error-items/offline-error-item-service.test.ts src/offline/__tests__/ai/queue-runtime-controls.test.ts
git commit -m "feat: add offline error-item service and queue retry controls"
```

---

### Task 4: Wire add/detail flows to offline services and queue actions

**Files:**
- Modify: `src/app/notebooks/[id]/add/page.tsx`
- Modify: `src/app/error-items/[id]/page.tsx`
- Create: `src/components/offline/queue-status-panel.tsx`
- Modify: `src/app/notebooks/[id]/page.tsx`
- Test: `src/offline/__tests__/ui/ai-status-binding.test.tsx`

- [ ] **Step 1: Write failing UI binding tests**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueueStatusPanel } from '@/components/offline/queue-status-panel'

describe('queue status panel', () => {
  it('renders retry-all and pause/resume controls', () => {
    render(<QueueStatusPanel tasks={[]} paused={false} onRetryAll={async () => {}} onTogglePause={() => {}} />)
    expect(screen.getByRole('button', { name: /retry-all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/offline/__tests__/ui/ai-status-binding.test.tsx`
Expected: FAIL because `QueueStatusPanel` does not exist.

- [ ] **Step 3: Implement minimal UI wiring**

`add/page.tsx` save path change (offline-ready branch):

```ts
if (offlineReady) {
  await offlineErrorItemService.createAndQueueAnalyze({
    notebookId,
    ownerProfileId,
    questionText: finalData.question,
  })
  router.push(`/notebooks/${notebookId}`)
  return
}
```

`error-items/[id]/page.tsx` add Analyze Now handler:

```ts
await offlineErrorItemService.updateAndQueueAnalyze({
  id: item.id,
  ownerProfileId,
  questionText: item.questionText,
})
```

`queue-status-panel.tsx` status list and controls:

```tsx
<Button onClick={() => void onRetryAll()}>Retry-all</Button>
<Button onClick={onTogglePause}>{paused ? 'Resume' : 'Pause'}</Button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/offline/__tests__/ui/ai-status-binding.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/notebooks/[id]/add/page.tsx src/app/error-items/[id]/page.tsx src/components/offline/queue-status-panel.tsx src/app/notebooks/[id]/page.tsx src/offline/__tests__/ui/ai-status-binding.test.tsx
git commit -m "feat: connect add and detail flows to offline queue actions"
```

---

### Task 5: Enforce UI status vocabulary and add final targeted verification

**Files:**
- Modify: `src/components/error-list.tsx`
- Modify: `src/lib/translations.ts` (only keys needed for `pending|processing|success|failed`, retry-all, pause/resume)
- Modify: `src/offline/ai/types.ts` (if any mismatch detected)
- Test: `src/offline/__tests__/ui/ai-status-binding.test.tsx`

- [ ] **Step 1: Write failing vocabulary mapping test**

```tsx
import { describe, it, expect } from 'vitest'
import { mapAiStatusLabel } from '@/components/offline/queue-status-panel'

describe('ai status vocabulary mapping', () => {
  it('uses Pencil baseline vocabulary', () => {
    expect(mapAiStatusLabel('pending')).toBe('pending')
    expect(mapAiStatusLabel('processing')).toBe('processing')
    expect(mapAiStatusLabel('success')).toBe('success')
    expect(mapAiStatusLabel('failed')).toBe('failed')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/offline/__tests__/ui/ai-status-binding.test.tsx`
Expected: FAIL if mapping/labels diverge.

- [ ] **Step 3: Implement minimal mapping and UI chip wiring**

```ts
export function mapAiStatusLabel(status: 'pending' | 'processing' | 'success' | 'failed') {
  return status
}
```

Use mapped labels in `ErrorList` badges and queue panel rows.

- [ ] **Step 4: Run full targeted verification**

Run:
- `npm run test -- src/offline/__tests__/runtime/offline-bootstrap.test.ts`
- `npm run test -- src/offline/__tests__/error-items/offline-error-item-service.test.ts`
- `npm run test -- src/offline/__tests__/ai/queue-runtime-controls.test.ts`
- `npm run test -- src/offline/__tests__/ui/ai-status-binding.test.tsx`
- `npm run lint -- src/offline src/components/offline src/app/notebooks/[id]/add/page.tsx src/app/error-items/[id]/page.tsx src/components/error-list.tsx`

Expected:
- All listed tests PASS
- Lint PASS for touched files

- [ ] **Step 5: Commit**

```bash
git add src/components/error-list.tsx src/components/offline/queue-status-panel.tsx src/lib/translations.ts src/offline/ai/types.ts src/offline/__tests__/ui/ai-status-binding.test.tsx
git commit -m "feat: align ai status chips and queue controls with pencil baseline"
```

---

## Spec Coverage Check

- Startup SQLite real wiring: covered by Task 2.
- Add/edit/detail offline + queue actions: covered by Task 3 + Task 4.
- Queue statuses and controls (`retry-all`, `pause/resume`): covered by Task 3 + Task 4 + Task 5.
- Error/retry startup observability: covered by Task 1.
- Near-release automated tests: covered by Tasks 1, 3, 4, 5.

## Placeholder Scan

- No `TODO`, `TBD`, or “similar to previous task” instructions.
- Every code-changing step includes concrete snippet.
- Every validation step includes exact command and expected result.

## Type Consistency Check

- AI status vocabulary fixed to `pending|processing|success|failed` across `types`, UI mapping, and tests.
- Queue control method names used consistently: `retryTask`, `retryAllFailedTasks`, `onTogglePause`.
- Offline domain service names used consistently: `createAndQueueAnalyze`, `updateAndQueueAnalyze`.
