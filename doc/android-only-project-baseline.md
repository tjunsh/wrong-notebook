# Android-Only Project Baseline

This repository is now treated as an **Android-first project** for packaging and delivery.

## Scope

- Keep Android APK build path
- Keep offline runtime and sqlite flow
- Keep optional online integrations only as optional features
- Remove Docker/server deployment artifacts from active delivery path

## Canonical build workflow

- `.github/workflows/android-apk.yml`

## Build triggers

1. Manual: `workflow_dispatch`
   - `build_variant=debug` for internal testing
   - `build_variant=release` for release candidate
2. Tag push: `v*`
   - automatic release APK build

## Current policy

- Do not use Docker build/release workflows
- Do not rely on NAS/cloud deployment docs for APK delivery
- APK packaging must remain available from GitHub Actions alone
