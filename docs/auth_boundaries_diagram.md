Auth Boundaries Diagram (textual)

Application surface:
- /login (UI) -> Credential sign-in form
- / (home) and other pages -> protected by middleware
- /api/auth/[...nextauth]/route.ts -> NextAuth wiring

Auth data flow:
- User submits credentials on /login → signIn('credentials')
- CredentialsProvider.authorize() loads user by email from Prisma, checks isActive and password via bcrypt, returns user object with id, email, name, role
- NextAuth stores session as JWT with fields id, role; session() callback attaches user.id and user.role to session.user
- Client stores session/token in cookie next-auth.session-token (explicit cookie name)
- Middleware reads token via next-auth/jwt getToken, determines isAuth, redirects unauthenticated users to /login with callbackUrl, redirects authenticated users away from /login
- Admin-bound routes use isAdmin(session.user) via auth-utils.ts; implement requireAdmin on protected routes as needed

Module boundaries:
- Core: src/lib/auth.ts, src/app/api/auth/[...nextauth]/route.ts, src/middleware.ts, src/lib/prisma.ts, src/lib/auth-utils.ts
- UI: src/app/login/page.tsx, other pages guarded by middleware
- Types: src/types/next-auth.d.ts
- Logging: src/lib/logger.ts

Notes:
- This is a textual diagram; for better clarity consider a mermaid diagram in a separate file if needed.
