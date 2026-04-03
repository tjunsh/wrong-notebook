# Android Full Pencil UI Design (Offline-First)

Date: 2026-04-03
Scope: Full UI rollout for Android app, aligned to Pencil MCP visual + interaction baseline, while preserving current route skeleton.

## 1. Problem Statement

Current implementation has partial Pencil alignment focused on queue UI (`QueueStatusPanel` and related status vocabulary), but most routes still use mixed legacy styles and interaction patterns. This creates inconsistent UX and weakens Android product coherence.

Goal: deliver a **full Pencil-consistent UI system** across all user-facing Android routes without destabilizing core offline functionality.

## 2. Design Decision Summary

### Selected baseline

- **Visual + interaction full alignment** to Pencil
- **Keep existing route skeleton** to minimize risk and avoid unnecessary IA rewrite

### Why this baseline

- Faster to implement than full route/IA rebuild
- Delivers clear UX consistency gains immediately
- Keeps offline runtime and queue behavior stable

## 3. Approach Options and Trade-offs

### Option A — Visual-only full skin

- What: unify spacing/color/typography/components only
- Pros: lowest risk and fastest
- Cons: interaction mismatch remains; user experience still feels inconsistent

### Option B — Visual + interaction full alignment (**Recommended**)

- What: A + harmonize interaction choreography (CTA hierarchy, loading/error/empty feedback, queue affordances)
- Pros: best ROI, strong product consistency, moderate delivery risk
- Cons: more implementation than visual-only

### Option C — Visual + interaction + IA/route re-architecture

- What: B + route hierarchy and page decomposition rewrite
- Pros: cleanest long-term architecture
- Cons: highest risk and schedule cost, larger regression surface

## 4. Route-by-Route Design Targets

### 4.1 Entry/Auth

Routes:
- `/login`, `/register`

Targets:
- Pencil card-shell layout, consistent top spacing and form rhythm
- Unified primary/secondary button semantics
- Inline validation and status messaging style

### 4.2 Home / Capture Entry

Route:
- `/` (`src/app/page.tsx`)

Targets:
- Pencil action-center hierarchy (upload primary, notebook/tags/stats secondary)
- Consistent progress overlay language and motion timing
- Simplified header action grouping (settings/notice/logout)

### 4.3 Notebook List + Detail + Item Detail

Routes:
- `/notebooks`
- `/notebooks/[id]`
- `/error-items/[id]`

Targets:
- Notebook cards and list rows follow Pencil spacing/typography scale
- Detail page keeps queue panel as canonical right/secondary block
- Add missing AI status chip in item detail with Pencil vocabulary (`pending/processing/success/failed`)

### 4.4 Add/Edit + Review Flow

Routes/components:
- `/notebooks/[id]/add`
- `CorrectionEditor`

Targets:
- Pencil form sections with explicit step rhythm
- Uniform field labels, helper text, error hint style
- Queue-related status/feedback consistently visible after save/analyze actions

### 4.5 Stats / Tags / Settings

Routes:
- `/stats`, `/tags`, settings dialogs/pages

Targets:
- Shared page scaffold and section spacing
- Unified KPI/stat card presentation
- Consistent empty/error/permission states

### 4.6 System States

Targets (all routes):
- Empty state, error state, loading state, offline/online badges, queue fallback hints all use one Pencil state language

## 5. Design System Contract (Implementation-level)

## 5.1 Tokens

- Define and enforce token mapping for:
  - spacing scale
  - text hierarchy
  - status colors (pending/processing/success/failed/offline)
  - card radius/shadow/border

## 5.2 Shared Components to Standardize

- Top app header block
- Section card shell
- Status chip
- Empty/error banner block
- Primary/secondary/danger CTA groups
- Queue item row + queue summary block

## 5.3 Interaction Principles

- Primary CTA is always visually dominant and singular
- Async operations always show deterministic state progression
- Error recovery always offers a clear next action (retry / go settings / back)

## 6. Rollout Plan (Design-first)

Phase 1 (highest impact)
- Notebook detail, queue panel consistency hardening, item detail AI status chip

Phase 2
- Home capture flow, add/edit/review alignment

Phase 3
- Stats/tags/settings/auth final unification + polish

## 7. Verification Criteria

Design acceptance checklist:
- Every major route uses the same visual hierarchy and spacing rhythm
- Queue/state vocabulary is consistent across all surfaces
- Empty/error/loading/offline states follow a single pattern
- No route contains legacy style outliers (font size scale, random button treatment, inconsistent card shells)

Implementation verification (for next planning step):
- UI snapshot checks for key routes
- Route-by-route visual diff review
- Existing offline tests remain green; UI binding tests expanded where needed

## 8. Risks and Mitigations

Risk: over-scoped rewrite causes regressions
- Mitigation: keep route skeleton, do phased componentized rollout

Risk: mixed old/new styles during migration window
- Mitigation: introduce shared UI contract first, then migrate route batches

Risk: queue semantics drift across pages
- Mitigation: centralize status mapping and translation keys reuse

## 9. Out of Scope

- Backend/data model redesign
- Full information architecture rewrite
- Non-Android platform-specific redesigns

## 10. Next Step

Create a detailed execution plan (file-by-file implementation checklist) using writing-plans skill, then implement in phased batches.
