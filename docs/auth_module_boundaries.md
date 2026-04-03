Authentication Module Boundaries and Entry Points

1. Core entry points
- /src/lib/auth.ts
  - Central NextAuth configuration: adapter, providers, callbacks, and cookie customization.
  - Exports: authOptions used by NextAuth API route.
- /src/app/api/auth/[...nextauth]/route.ts
  - Wires NextAuth(authOptions) to API routes (GET, POST).
- /src/middleware.ts
  - Global protection: uses next-auth/jwt token to gate access to pages. Redirects to /login if not authenticated.
- /src/app/login/page.tsx
  - UI for credentials login; triggers signIn('credentials') on form submit.
- /src/lib/prisma.ts
  - Prisma client instance used by auth provider for user lookup and identity, e.g., findUnique by email.
- /src/lib/auth-utils.ts
  - Admin guard helpers: isAdmin and requireAdmin to secure admin pages/routes.
- /src/types/next-auth.d.ts
  - Type augmentations for Session, User, JWT to include id and role across the flow.

2. Supporting data and services
- /src/lib/logger.ts
  - Structured logging across auth and middleware for observability.
- /Users/.../src/lib/prisma.ts (referenced above)
- Database models (e.g., User) likely include fields: id, email, name, password, role, isActive.

3. Boundary map summary
- Auth surface is tightly coupled to NextAuth with a Prisma adapter and a Credential provider.
- Authorization decisions derive from user.role and isActive flag; admin checks rely on isAdmin helper.
- Frontend routes protected by middleware; login page is the primary unauthenticated entrypoint.

4. Diagram notes (textual)
- User tries to access protected page -> middleware checks JWT in next-auth.session-token cookie -> if missing, redirects to /login?callbackUrl=... -> login page collects email/password and calls signIn('credentials') -> authorize() checks user by email, validates password, returns user payload with id/role -> JWT token enriched by callbacks -> session object carries user.id and user.role -> protected pages proceed if admin guard passes.
