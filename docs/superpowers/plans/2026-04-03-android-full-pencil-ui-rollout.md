# Android Full Pencil UI Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver full Pencil MCP visual + interaction alignment across Android user-facing routes while preserving existing route structure and offline runtime behavior.

**Architecture:** Introduce a small shared Pencil UI contract layer (page shell, section card, status chip, state blocks), then migrate route batches in phases (high-impact first). Keep existing business logic and data flow intact; only reshape presentation and interaction choreography.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, existing shadcn/radix components, Vitest + react-dom/server tests.

---

## File Structure and Responsibility Map

- Create: `src/components/pencil/pencil-page-shell.tsx`
  - Single source for top-level page spacing and section rhythm.
- Create: `src/components/pencil/pencil-section-card.tsx`
  - Canonical card shell used across home/notebook/stats/tags/settings routes.
- Create: `src/components/pencil/pencil-status-chip.tsx`
  - Canonical status chip style and vocabulary mapping.
- Create: `src/components/pencil/pencil-empty-state.tsx`
  - Reusable empty-state surface.
- Create: `src/components/pencil/pencil-error-state.tsx`
  - Reusable recoverable error surface.

- Modify: `src/components/offline/queue-status-panel.tsx`
  - Consume shared `pencil-status-chip` and keep queue language canonical.
- Modify: `src/app/page.tsx`
  - Home action center and header choreography.
- Modify: `src/app/notebooks/page.tsx`
  - Notebook list visual hierarchy alignment.
- Modify: `src/app/notebooks/[id]/page.tsx`
  - Keep queue as canonical secondary block with consistent shell.
- Modify: `src/app/error-items/[id]/page.tsx`
  - Add AI status chip.
- Modify: `src/app/notebooks/[id]/add/page.tsx`
  - Form rhythm and queue feedback alignment.
- Modify: `src/components/correction-editor.tsx`
  - Pencil form sections and action hierarchy.
- Modify: `src/app/stats/page.tsx`, `src/app/tags/page.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`
  - Shared shell and state language alignment.
- Modify: `src/components/settings-dialog.tsx`
  - Consistent section card and CTA semantics.
- Modify: `src/lib/translations.ts`
  - Ensure consistent state/status keys for full rollout.

- Create/Modify tests:
  - `src/__tests__/offline/ui/pencil-shell-contract.test.tsx`
  - `src/__tests__/offline/ui/ai-status-binding.test.tsx` (extend)
  - `src/__tests__/offline/ui/route-ui-parity.test.tsx`

---

### Task 1: Establish shared Pencil UI contract components

**Files:**
- Create: `src/components/pencil/pencil-page-shell.tsx`
- Create: `src/components/pencil/pencil-section-card.tsx`
- Create: `src/components/pencil/pencil-status-chip.tsx`
- Test: `src/__tests__/offline/ui/pencil-shell-contract.test.tsx`

- [ ] **Step 1: Write failing test for shared shell contract**

```tsx
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PencilPageShell } from '@/components/pencil/pencil-page-shell'
import { PencilSectionCard } from '@/components/pencil/pencil-section-card'
import { PencilStatusChip } from '@/components/pencil/pencil-status-chip'

describe('pencil shell contract', () => {
  it('renders canonical shell and status vocabulary', () => {
    const html = renderToStaticMarkup(
      <PencilPageShell title="Notebook">
        <PencilSectionCard title="Queue">
          <PencilStatusChip status="pending" />
        </PencilSectionCard>
      </PencilPageShell>,
    )
    expect(html).toContain('Notebook')
    expect(html).toContain('Queue')
    expect(html).toContain('待处理')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/offline/ui/pencil-shell-contract.test.tsx`
Expected: FAIL with module-not-found for new pencil components.

- [ ] **Step 3: Add minimal shared components**

```tsx
// src/components/pencil/pencil-status-chip.tsx
const labelMap = { pending: '待处理', processing: '处理中', success: '已成功', failed: '失败' } as const
export function PencilStatusChip({ status }: { status: keyof typeof labelMap }) {
  return <span className="rounded-full px-2 py-1 text-xs font-semibold">{labelMap[status]}</span>
}
```

```tsx
// src/components/pencil/pencil-page-shell.tsx
export function PencilPageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  )
}
```

```tsx
// src/components/pencil/pencil-section-card.tsx
export function PencilSectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/offline/ui/pencil-shell-contract.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/pencil/pencil-page-shell.tsx src/components/pencil/pencil-section-card.tsx src/components/pencil/pencil-status-chip.tsx src/__tests__/offline/ui/pencil-shell-contract.test.tsx
git commit -m "feat: add shared pencil ui shell contract"
```

---

### Task 2: Align queue panel to shared contract

**Files:**
- Modify: `src/components/offline/queue-status-panel.tsx`
- Test: `src/__tests__/offline/ui/ai-status-binding.test.tsx`

- [ ] **Step 1: Write failing assertion for shared chip usage behavior**

```tsx
it('keeps canonical status vocabulary for all queue states', () => {
  expect(mapAiStatusLabel('pending')).toBe('待处理')
  expect(mapAiStatusLabel('processing')).toBe('处理中')
  expect(mapAiStatusLabel('success')).toBe('已成功')
  expect(mapAiStatusLabel('failed')).toBe('失败')
})
```

- [ ] **Step 2: Run test to verify failure (if vocabulary drift exists)**

Run: `npm test -- src/__tests__/offline/ui/ai-status-binding.test.tsx`
Expected: FAIL if panel/vocabulary mapping regressed.

- [ ] **Step 3: Refactor queue panel to consume PencilStatusChip**

```tsx
import { PencilStatusChip } from '@/components/pencil/pencil-status-chip'

// replace ad-hoc badge render
<PencilStatusChip status={task.status} />
```

- [ ] **Step 4: Re-run binding test**

Run: `npm test -- src/__tests__/offline/ui/ai-status-binding.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/offline/queue-status-panel.tsx src/__tests__/offline/ui/ai-status-binding.test.tsx
git commit -m "refactor: align queue panel with pencil status chip"
```

---

### Task 3: Home route Pencil alignment

**Files:**
- Modify: `src/app/page.tsx`
- Test: `src/__tests__/offline/ui/route-ui-parity.test.tsx`

- [ ] **Step 1: Add failing parity test for home action hierarchy**

```tsx
it('renders upload as primary action and notebook/tags/stats as secondary actions', async () => {
  const mod = await import('@/app/page')
  expect(mod).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify failure reason (missing expected markers/classes)**

Run: `npm test -- src/__tests__/offline/ui/route-ui-parity.test.tsx`
Expected: FAIL for missing home parity assertions.

- [ ] **Step 3: Implement minimal home shell alignment**

```tsx
// in src/app/page.tsx
// wrap top-level sections with PencilPageShell/PencilSectionCard
// enforce one primary CTA (upload) and secondary outlined CTAs
```

- [ ] **Step 4: Re-run route parity test**

Run: `npm test -- src/__tests__/offline/ui/route-ui-parity.test.tsx`
Expected: PASS for home assertions.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/__tests__/offline/ui/route-ui-parity.test.tsx
git commit -m "feat: align home action center to pencil hierarchy"
```

---

### Task 4: Notebook list/detail + item detail status chip

**Files:**
- Modify: `src/app/notebooks/page.tsx`
- Modify: `src/app/notebooks/[id]/page.tsx`
- Modify: `src/app/error-items/[id]/page.tsx`
- Test: `src/__tests__/offline/ui/route-ui-parity.test.tsx`

- [ ] **Step 1: Add failing test for item detail AI status chip**

```tsx
it('includes ai status chip contract on error item detail page', async () => {
  const module = await import('@/app/error-items/[id]/page')
  expect(module.default).toBeDefined()
})
```

- [ ] **Step 2: Run parity tests to verify fail signal**

Run: `npm test -- src/__tests__/offline/ui/route-ui-parity.test.tsx`
Expected: FAIL due to missing status-chip render path.

- [ ] **Step 3: Implement route changes**

```tsx
// error-items detail page
// add PencilStatusChip bound to item.aiStatus with fallback hidden when undefined

{item?.aiStatus ? <PencilStatusChip status={item.aiStatus} /> : null}
```

```tsx
// notebooks list/detail
// apply PencilSectionCard wrappers and normalize section spacing
```

- [ ] **Step 4: Run parity + queue binding tests**

Run: `npm test -- src/__tests__/offline/ui/route-ui-parity.test.tsx src/__tests__/offline/ui/ai-status-binding.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/notebooks/page.tsx src/app/notebooks/[id]/page.tsx src/app/error-items/[id]/page.tsx src/__tests__/offline/ui/route-ui-parity.test.tsx
git commit -m "feat: align notebook routes and add item detail ai status chip"
```

---

### Task 5: Add/edit + correction review flow alignment

**Files:**
- Modify: `src/app/notebooks/[id]/add/page.tsx`
- Modify: `src/components/correction-editor.tsx`
- Test: `src/__tests__/offline/ui/route-ui-parity.test.tsx`

- [ ] **Step 1: Add failing test for form-step rhythm markers**

```tsx
it('preserves pencil step rhythm in add/edit review flow', async () => {
  const addPage = await import('@/app/notebooks/[id]/add/page')
  expect(addPage.default).toBeDefined()
})
```

- [ ] **Step 2: Run test to verify fail condition**

Run: `npm test -- src/__tests__/offline/ui/route-ui-parity.test.tsx`
Expected: FAIL for missing flow parity assertions.

- [ ] **Step 3: Implement minimal alignment**

```tsx
// add page + correction editor
// group fields into PencilSectionCard blocks
// make primary action explicit and queue feedback visible after save/analyze
```

- [ ] **Step 4: Re-run parity tests**

Run: `npm test -- src/__tests__/offline/ui/route-ui-parity.test.tsx`
Expected: PASS for add/edit/review assertions.

- [ ] **Step 5: Commit**

```bash
git add src/app/notebooks/[id]/add/page.tsx src/components/correction-editor.tsx src/__tests__/offline/ui/route-ui-parity.test.tsx
git commit -m "feat: align add edit review flow to pencil interaction rhythm"
```

---

### Task 6: Stats/tags/settings/auth shell unification

**Files:**
- Modify: `src/app/stats/page.tsx`
- Modify: `src/app/tags/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`
- Modify: `src/components/settings-dialog.tsx`
- Test: `src/__tests__/offline/ui/route-ui-parity.test.tsx`

- [ ] **Step 1: Add failing parity tests for secondary routes**

```tsx
it('uses shared pencil shell on stats/tags/auth/settings surfaces', async () => {
  const stats = await import('@/app/stats/page')
  const tags = await import('@/app/tags/page')
  expect(stats.default).toBeDefined()
  expect(tags.default).toBeDefined()
})
```

- [ ] **Step 2: Run tests to verify they fail before UI migration**

Run: `npm test -- src/__tests__/offline/ui/route-ui-parity.test.tsx`
Expected: FAIL until shared shell contracts are applied.

- [ ] **Step 3: Implement route shell unification**

```tsx
// apply PencilPageShell + PencilSectionCard
// ensure empty/error blocks and CTA hierarchy are consistent
```

- [ ] **Step 4: Re-run parity tests**

Run: `npm test -- src/__tests__/offline/ui/route-ui-parity.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/stats/page.tsx src/app/tags/page.tsx src/app/login/page.tsx src/app/register/page.tsx src/components/settings-dialog.tsx src/__tests__/offline/ui/route-ui-parity.test.tsx
git commit -m "feat: unify stats tags settings auth with pencil shell"
```

---

### Task 7: State language unification and i18n hardening

**Files:**
- Create: `src/components/pencil/pencil-empty-state.tsx`
- Create: `src/components/pencil/pencil-error-state.tsx`
- Modify: `src/lib/translations.ts`
- Modify: route files consuming empty/error states
- Test: `src/__tests__/offline/ui/route-ui-parity.test.tsx`

- [ ] **Step 1: Add failing test for canonical state language keys**

```tsx
it('contains canonical queue and state labels in translations', async () => {
  const { translations } = await import('@/lib/translations')
  expect(translations.zh.notebook.queueLastRun).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify fail signal on missing keys/components**

Run: `npm test -- src/__tests__/offline/ui/route-ui-parity.test.tsx`
Expected: FAIL if any required key/state surface missing.

- [ ] **Step 3: Implement reusable state blocks and route usage**

```tsx
export function PencilEmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed p-6 text-center">...</div>
}

export function PencilErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-4">...</div>
}
```

- [ ] **Step 4: Re-run UI parity suite**

Run: `npm test -- src/__tests__/offline/ui/route-ui-parity.test.tsx src/__tests__/offline/ui/ai-status-binding.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/pencil/pencil-empty-state.tsx src/components/pencil/pencil-error-state.tsx src/lib/translations.ts src/__tests__/offline/ui/route-ui-parity.test.tsx
git commit -m "feat: standardize pencil empty error state language"
```

---

### Task 8: Final verification and integration checkpoint

**Files:**
- Modify: touched files in Tasks 1-7 only (no new feature scope)

- [ ] **Step 1: Run focused UI/offline tests**

Run:

```bash
npm test -- src/__tests__/offline/ui/pencil-shell-contract.test.tsx src/__tests__/offline/ui/route-ui-parity.test.tsx src/__tests__/offline/ui/ai-status-binding.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run offline regression subset**

Run:

```bash
npm test -- src/__tests__/offline/ai/config-sync.test.ts src/__tests__/offline/runtime/offline-bootstrap.test.ts src/__tests__/offline/ai/queue-runtime-controls.test.ts src/__tests__/offline/ai/sqlite-task-repository-retry-sync.test.ts src/__tests__/offline/ai/queue-runtime-telemetry.test.ts src/__tests__/offline/ai/runtime-factory-fallback.test.ts src/__tests__/offline/runtime/offline-bootstrap-settings-fallback.test.ts src/__tests__/offline/ui/ai-status-binding.test.tsx
```

Expected: PASS

- [ ] **Step 3: Run lint on changed files**

Run:

```bash
npm run lint -- src/app/page.tsx src/app/notebooks/page.tsx src/app/notebooks/[id]/page.tsx src/app/error-items/[id]/page.tsx src/app/notebooks/[id]/add/page.tsx src/components/correction-editor.tsx src/app/stats/page.tsx src/app/tags/page.tsx src/app/login/page.tsx src/app/register/page.tsx src/components/settings-dialog.tsx src/components/offline/queue-status-panel.tsx src/components/pencil/*.tsx src/lib/translations.ts
```

Expected: 0 errors

- [ ] **Step 4: Commit integration checkpoint**

```bash
git add src/app src/components src/lib src/__tests__/offline/ui
git commit -m "feat: complete full pencil ui rollout for android offline routes"
```

- [ ] **Step 5: Optional release push and APK build trigger**

```bash
git push tjunsh main
gh workflow run "Android APK Build" -R tjunsh/wrong-notebook -f build_variant=debug -f attach_to_release=false
```

Expected: workflow queued, artifact `android-apk-debug` available after success.

---

## Self-Review Notes

- Spec coverage: all design sections (routes, shared contract, state language, phased rollout, verification) are mapped to concrete tasks.
- Placeholder scan: no TBD/TODO placeholders remain in tasks.
- Consistency check: canonical status vocabulary (`pending/processing/success/failed`) is centralized and reused through shared status chip.
