# Session Handoff - Offline Android + OpenCode Superpowers (Latest)

## 1) Current Objective

Continue delivering an **offline-first Android APK path** for wrong-notebook:

- Local data persistence: SQLite (Capacitor runtime)
- AI processing: cloud-only queue (OpenAI-compatible / Gemini-compatible)
- UI aligned with Pencil design for queue state
- Ready for APK-side validation flow (not localhost-dependent)

---

## 2) OpenCode Superpowers Status (Project-Scoped, Pinned)

Configured in:

- `opencode.json`

Pinned plugin source:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "superpowers@git+https://github.com/obra/superpowers.git#b7a8f76985f1e93e75dd2f2a3b424dc731bd9d37"
  ]
}
```

This ensures OpenCode uses its own explicit superpowers source (no ambiguity with other environments).

---

## 3) What Was Completed in This Session

### A. Runtime/Queue Integration for APK path

#### New files

- `src/offline/ai/storage.ts`
  - Browser/native (Capacitor Preferences if available) KV + secret storage implementation
- `src/offline/ai/runtime-factory.ts`
  - Builds singleton offline AI runtime from sqlite repo + config store
  - Exposes `ensureOfflineAiRuntime(...)`
  - Exposes `syncOfflineAiConfigFromServer(...)`
- `src/offline/ai/config-sync.ts`
  - Maps `/api/settings` AppConfig to offline AI config format
  - Writes to local offline config store

#### Updated files

- `src/offline/runtime/offline-bootstrap.client.tsx`
  - After offline init:
    1) sync offline AI config from server settings
    2) start queue runtime loop (`30_000ms`)
- `src/app/notebooks/[id]/page.tsx`
  - `retry-all` now triggers immediate runtime execution (`runNow`) when offline sqlite connection exists
- `src/offline/ai/sqlite-task-repository.ts`
  - `retryTask` / `retryAllFailedTasks` now also sync `error_items.ai_status = 'pending'`

### B. Pencil-aligned UI (queue state)

- `src/components/offline/queue-status-panel.tsx`
  - Updated to match Pencil queue-state direction (status header, online/offline badge, task rows, action buttons)
  - status labels mapped to Chinese queue vocabulary
- `src/app/notebooks/[id]/page.tsx`
  - Integrated Pencil-style queue panel with merged pending/processing/failed task feed
- `src/app/offline-queue-test/page.tsx`
  - Dedicated local queue interaction preview page (for visual behavior checks)
- `src/lib/translations.ts`
  - Added queue-related i18n keys (`queueCountTitle`, `queueOffline`, `queueOnline`, etc.)

### C. Dev runtime startup fixes

- `package.json`
  - `dev` script now uses webpack mode to bypass current Turbopack wasm issue:
  - `next dev --webpack -H 0.0.0.0`
- `next.config.ts`
  - Added webpack raw SQL loader for `schema.sql?raw` via `asset/source`

---

## 4) Test/Verification Status

### Passed

- Targeted eslint on new/updated offline integration files: passed
- Offline test suite (queue/runtime/config sync) passed:
  - `src/__tests__/offline/ai/config-sync.test.ts`
  - `src/__tests__/offline/runtime/offline-bootstrap.test.ts`
  - `src/__tests__/offline/ai/queue-runtime-controls.test.ts`
  - `src/__tests__/offline/ai/sqlite-task-repository-retry-sync.test.ts`
  - `src/__tests__/offline/ui/ai-status-binding.test.tsx`
  - Result: **5 files, 8 tests passed**

### Known environment-level caveat

- Full `next build` still fails in this machine/env due to Next SWC wasm/turbo issue:
  - `turbo.createProject is not supported by the wasm bindings`
  - not introduced by business-logic changes in this session

---

## 5) What To Do First After Restart

1. Open project and continue from this file.
2. Start dev server:

```bash
npm run dev
```

3. Log in (middleware protection applies), then verify:
   - `/offline-queue-test` (UI behavior)
   - `/notebooks/<id>` (real integrated queue panel)

---

## 6) Next Recommended Work (Priority)

1. **APK runtime validation support**
   - Add lightweight runtime telemetry panel/log for queue tick/runNow outcomes (success/failed count)
2. **Offline AI config robustness**
   - Handle `/api/settings` fetch failure in bootstrap with non-blocking fallback + user-visible hint
3. **Queue UX robustness**
   - Optional: explicit “last run time / last error” summary in panel

---

## 7) Resume Prompt (Copy/Paste)

Use this after reboot to resume fast:

> Continue from `doc/session-handoff-offline-android-superpowers.md`. Keep advancing APK-ready offline AI queue integration. Focus next on runtime telemetry for queue execution and bootstrap fallback handling when `/api/settings` is unavailable.
