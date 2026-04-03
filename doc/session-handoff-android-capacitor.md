# Session Handoff - Android (Capacitor) Migration

## Last Updated

- Date: 2026-04-02
- Context: User clarified target = migrate `wttwins/wrong-notebook` to Android using Capacitor.

## Confirmed Decisions

1. Target platform: **Android app**
2. Framework route: **Capacitor**
3. Immediate deliverables first: **technical migration plan + product requirements doc**

## Documents Created in This Session

1. `doc/capacitor-android-migration-plan.md`
   - Architecture judgment
   - Capacitor integration approach
   - milestone/checklist/risk plan

2. `doc/android-product-requirements.md`
   - MVP scope
   - user flows
   - acceptance criteria

## Important Technical Note

Current branch has moved to **offline-first Android implementation**:

- local sqlite persistence
- local queue/runtime wiring
- APK packaging via GitHub Actions

Cloud backend is optional for enhanced AI capabilities, but Android packaging/installation itself is independent.

## Suggested Next Execution Steps

1. Add Capacitor dependencies and config files.
2. Generate Android native project (`npx cap add android`).
3. Configure appId, appName, and local runtime bridge.
4. Sync and build debug APK in Android Studio.
5. Verify login, wrong-item CRUD, AI analysis flow on emulator/device.

## Resume Prompt (for next session)

Use this exact instruction to resume quickly:

> Continue implementing Android migration for wrong-notebook based on `doc/capacitor-android-migration-plan.md` and `doc/android-product-requirements.md`. Start from Capacitor dependency/config setup and generate Android project.
