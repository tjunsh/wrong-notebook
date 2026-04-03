Auth Overview

- Core authentication stack: NextAuth.js with Prisma adapter using a JWT-based session strategy.
- User credentials are validated via a CredentialsProvider (email/password).
- Session data includes user id and role; JWT tokens carry id and role for downstream checks.
- Admin checks are centralized in src/lib/auth-utils.ts (isAdmin, requireAdmin).
- Global route protection is enforced by middleware (src/middleware.ts) using NextAuth JWT token from cookies named next-auth.session-token.
- Admin and protected routes are guarded by examining session.user.role (e.g., 'admin').

Key entry points:
- src/lib/auth.ts: NextAuth configuration, providers, callbacks, and cookie setup.
- src/app/api/auth/[...nextauth]/route.ts: NextAuth API route wiring.
- src/middleware.ts: Global route protection and redirects.
- src/app/login/page.tsx: UI flow for credential login.
- src/lib/auth-utils.ts: Admin guard helpers.

Notes:
- Cookie naming is explicitly set to next-auth.session-token for environment compatibility.
- The system supports dynamic AI provider configuration elsewhere, but authentication is centralized here.

Next steps:
- Add a small diagram mapping auth data flow (credentials -> signIn -> session/jwt -> middleware guards).
- Align tests to cover sign-in and protected routes.
