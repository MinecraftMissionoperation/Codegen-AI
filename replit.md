# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT (jsonwebtoken) + bcryptjs for password hashing
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2 for owners, gpt-5.1 for users)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── coding-ai/          # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server-side client
│   └── integrations-openai-ai-react/   # OpenAI React hooks
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

### Coding AI App (`artifacts/coding-ai`)
- Login / Register pages with JWT auth (cross-device via localStorage)
- Password encrypted with bcrypt (12 salt rounds)
- 2-step registration: username availability check, then password
- **Daily limit**: 5 questions/day for normal users (resets each day, no stacking)
- **Owner account**: username `missionoperation` gets unlimited questions + best AI model (gpt-5.2)
- Normal users get gpt-5.1
- Real-time streaming code generation via SSE
- Language selector, history sidebar, copy-to-clipboard
- Daily usage progress bar shown in sidebar

### Database Schema
- `users` table: id, username (unique), password_hash, role (user/owner), questions_today, last_reset_date
- `conversations` and `messages` tables for OpenAI integration

### Auth System
- JWT tokens signed with `JWT_SECRET` env var (30-day expiry)
- Tokens stored in localStorage for cross-device support
- `requireAuth` middleware protects `/api/codegen/generate`
- Owner detection: username `missionoperation` → role `owner` at registration

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes:
- `GET /api/healthz` — health check
- `POST /api/auth/check-username` — check username availability
- `POST /api/auth/register` — register new account
- `POST /api/auth/login` — login
- `GET /api/auth/me` — get current user (requires auth)
- `POST /api/codegen/generate` — generate code (requires auth, enforces daily limit)

### `artifacts/coding-ai` (`@workspace/coding-ai`)

React + Vite frontend with Tailwind CSS, Shadcn UI, Framer Motion.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `pnpm --filter @workspace/db run push` — sync schema to DB

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec. Run codegen: `pnpm --filter @workspace/api-spec run codegen`
