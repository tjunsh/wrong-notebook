Auth Plan - Incremental Changes

Goal: Strengthen authentication reliability, security, and test coverage; maintain clear boundaries between auth surface and app logic.

Phase 1: Audit Completion (Completed)
- Outcome: Document findings from src/lib/auth.ts, middleware.ts, and related files.

Phase 2: Module Boundary Mapping (Pending)
- Deliverable: Diagram/list of auth entry points, API route wiring, prisma usage, and admin guards.
- Risks: Potential misalignment between admin guards and route-level protections.

Phase 3: Test Suite Enhancement (Pending)
- Deliverable: Skeleton tests for login flow, protected routes, and admin-guarded pages.
- Approach: Use Vitest with existing mocking style; simulate signIn flow and middleware redirects.

Phase 4: Auth Overview Publication (Pending)
- Deliverable: Public-facing auth overview doc and patch plan (docs/auth_overview.md, docs/auth_architecture.md, docs/auth_plan.md).

Phase 5: Implementation Rollout (Pending)
- Deliverable: Implement changes; run lints, typechecks, tests, and build.
- Rollback: If tests fail, revert changes and reassess.

Success Criteria:
- All auth-related entry points are clearly documented.
- Tests cover login and protected routes with minimal flaky behavior.
- No regression in existing authentication behavior.
