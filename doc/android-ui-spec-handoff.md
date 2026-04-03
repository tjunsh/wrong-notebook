# Android Offline App UI Specification (Handoff)

## 1. Scope

This document consolidates the delivered wireframes for the offline-first Android app (Capacitor) and translates them into implementation-ready UI specifications.

- Target: Android standalone app
- Data mode: local-first (offline core)
- AI mode: local-first queue, optional online provider enhancement

---

## 2. Wireframe Inventory (12 Screens)

### Batch 1 (Core Flow)

1. Local Entry (Onboarding / Unlock)
   - File: `.sisyphus/ui-wireframes/N32HC.png`
   - Screen ID: `N32HC`

2. Notebook List
   - File: `.sisyphus/ui-wireframes/268h1.png`
   - Screen ID: `268h1`

3. Error Item Detail
   - File: `.sisyphus/ui-wireframes/IAgJf.png`
   - Screen ID: `IAgJf`

4. AI Settings
   - File: `.sisyphus/ui-wireframes/UUVPJ.png`
   - Screen ID: `UUVPJ`

### Batch 2 (Feature Completion)

5. Add/Edit Error Item
   - File: `.sisyphus/ui-wireframes/YwgC1.png`
   - Screen ID: `YwgC1`

6. Review Mode
   - File: `.sisyphus/ui-wireframes/nmmuW.png`
   - Screen ID: `nmmuW`

7. Stats
   - File: `.sisyphus/ui-wireframes/MXxpB.png`
   - Screen ID: `MXxpB`

8. Import/Export
   - File: `.sisyphus/ui-wireframes/OkLIS.png`
   - Screen ID: `OkLIS`

### Batch 3 (State & System UX)

9. App Shell + Bottom Navigation
   - File: `.sisyphus/ui-wireframes/AHUI4.png`
   - Screen ID: `AHUI4`

10. Empty State
   - File: `.sisyphus/ui-wireframes/2u3yR.png`
   - Screen ID: `2u3yR`

11. Error State (AI failure)
   - File: `.sisyphus/ui-wireframes/LdrMa.png`
   - Screen ID: `LdrMa`

12. Network + AI Queue State
   - File: `.sisyphus/ui-wireframes/dCh2I.png`
   - Screen ID: `dCh2I`

---

## 3. Route Map (Recommended)

```text
/entry                              -> N32HC
/home/notebooks                     -> 268h1 (+ AHUI4 shell)
/notebooks/:id/items/new            -> YwgC1
/notebooks/:id/items/:itemId        -> IAgJf
/review                             -> nmmuW (+ AHUI4 shell)
/stats                              -> MXxpB (+ AHUI4 shell)
/settings/ai                        -> UUVPJ
/settings/backup                    -> OkLIS
/state/empty                         -> 2u3yR (embedded state)
/state/error                         -> LdrMa (embedded state)
/state/queue                         -> dCh2I (embedded state)
```

Note: `2u3yR`, `LdrMa`, `dCh2I` are state screens and should mostly be implemented as reusable state containers/components inside feature pages.

---

## 4. Core UI Components (Implementation List)

1. TopBar (title + optional back/action)
2. BottomTabBar (home/review/stats/settings)
3. Card container (default white card)
4. Input row (label + field)
5. Textarea-like block input
6. Primary button / secondary button / danger button
7. Status chip (`pending`, `processing`, `failed`, `success`)
8. Tag chip
9. EmptyState block (icon/title/description/cta)
10. ErrorBanner block (title/message/actions)
11. QueueList item row
12. StatMetric card + simple bar row

---

## 5. Screen-by-Screen Functional UI Notes

## 5.1 Local Entry (`N32HC`)

- Purpose: local app entry, not network authentication
- Mode A (default): direct enter app (single-user local mode)
- Mode B (optional): local unlock (PIN or biometric)
- Note: no server account dependency in offline baseline

## 5.2 Notebook List (`268h1`)

- Search box
- Notebook cards (count + pending review)
- Add button

## 5.3 Add/Edit Error Item (`YwgC1`)

- Upload image area (camera/gallery trigger)
- Question text input
- Tags input
- Dual CTA:
  - Save only
  - Save and analyze (enqueue AI)

## 5.4 Error Item Detail (`IAgJf`)

- Image preview / question text
- AI status chip
- Tag chips
- Actions:
  - enqueue AI
  - analyze now

## 5.5 Review (`nmmuW`)

- Current question card
- Remaining count
- Quick grading actions: Not mastered / Mastered

## 5.6 Stats (`MXxpB`)

- Overview metric cards (total, mastery rate)
- Subject distribution bars

## 5.7 AI Settings (`UUVPJ`)

- Protocol type selector:
  - `openai_compatible`
  - `gemini_compatible`
- Base URL
- API key (masked)
- Model
- Save config

## 5.8 Import/Export (`OkLIS`)

- Export card + CTA
- Import card + CTA
- Security note: backup excludes sensitive keys by default

## 5.9 App Shell (`AHUI4`)

- Persistent bottom tab layout
- Active tab highlight state

## 5.10 Empty/Error/Queue States (`2u3yR`, `LdrMa`, `dCh2I`)

- Empty: first-use guidance + cta
- Error: retry and defer actions
- Queue: offline badge, queue item statuses, retry-all action

---

## 6. UI State Matrix (Must Implement)

For each feature page, support at least:

1. Loading
2. Success
3. Empty
4. Error (recoverable)
5. Offline (if network-dependent function exists)

AI task status vocabulary (global):

- `pending`
- `processing`
- `success`
- `failed`

---

## 7. Navigation Rules

1. Android back button:
   - pop current view if stack depth > 1
   - otherwise confirm exit on root tabs

2. Tab behavior:
   - preserve scroll/state per tab when switching

3. Deep links (optional future):
   - notebook detail
   - error item detail

---

## 8. Visual Tokens (Wireframe Baseline)

- Primary: `#F97316`
- Background: `#F8FAFC`
- Surface: `#FFFFFF`
- Border: `#CBD5E1` / `#E2E8F0`
- Text primary: `#0F172A`
- Text secondary: `#64748B`

Use these as a baseline; final theme tokens can be extracted to a centralized design token file.

---

## 9. Engineering Build Order (Recommended)

### Step 1: Layout foundation
- App shell + tab bar (`AHUI4`)
- navigation setup + route scaffolding

### Step 2: Data-entry pipeline
- notebook list (`268h1`)
- add/edit (`YwgC1`)
- detail (`IAgJf`)

### Step 3: Learning workflow
- review (`nmmuW`)
- stats (`MXxpB`)

### Step 4: Infra UX
- AI settings (`UUVPJ`)
- import/export (`OkLIS`)
- state components (`2u3yR`, `LdrMa`, `dCh2I`)

---

## 10. Definition of Done (UI)

1. All 12 wireframe screens mapped to routes/components
2. Core pages match structure and hierarchy of wireframes
3. Empty/error/offline states available and testable
4. Bottom navigation and back behavior consistent on Android
5. AI settings supports OpenAI-compatible + Gemini-compatible configs
