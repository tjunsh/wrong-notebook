Authentication Architecture - Key Components

1. Core Auth Engine
- Location: src/lib/auth.ts
- Details:
  - NextAuthOptions configured with PrismaAdapter(prisma).
  - Session strategy: jwt.
  - Custom cookie: next-auth.session-token with environment-aware secure flag.
  - CredentialsProvider for email/password authentication; uses bcryptjs to compare passwords.
  - Callbacks: session() injects user id and role into the session; jwt() enriches token with id and role.
- API wiring: src/app/api/auth/[...nextauth]/route.ts exposes GET/POST handlers connected to NextAuth(authOptions).

2. Data Layer
- Prisma client: src/lib/prisma.ts
- Admin guard helpers: src/lib/auth-utils.ts (isAdmin, requireAdmin)
- User data model integration: src/lib/auth.ts uses prisma.user to fetch user by email.
- User/Session typing: src/types/next-auth.d.ts augments Session, User, and JWT with id and role.

3. Protection & UI Flows
- Global middleware: src/middleware.ts uses next-auth/jwt to verify a valid session; redirects unauthenticated requests to /login; redirects authenticated users away from /login.
- Login UI: src/app/login/page.tsx demonstrates credentials-based login via signIn('credentials').
- Admin protection: authorization checks are available via isAdmin/requireAdmin for route guards.

4. Project Boundaries
- Project appears as a single-package Next.js app (not a strict monorepo based on root package.json).
- AI provider configuration is dynamic elsewhere (in UI/config) but authentication surface is stable and centralized here.

5. Risk & Improvement Opportunities
- Ensure NEXTAUTH_SECRET is securely managed in all environments.
- Consider adding MFA hooks or additional session guards for high-value actions.
- Expand tests to cover admin routes and edge cases (disabled accounts, password resets).
