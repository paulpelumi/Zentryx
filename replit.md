# R&D Intelligence Suite

## Overview

Enterprise-grade R&D management platform for Food Science companies. Full-stack web application with JWT authentication, project lifecycle management, formulation science data capture, analytics engine, and AI-powered suggestions.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + Framer Motion + Recharts + Zustand
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: JWT (bcryptjs + jsonwebtoken)
- **Build**: esbuild (CJS bundle)

## Login Credentials (Demo)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rnd.com | admin123 |
| Manager | manager@rnd.com | manager123 |
| Scientist | alice@rnd.com | scientist123 |
| Analyst | carol@rnd.com | analyst123 |

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── rd-intelligence/    # React+Vite frontend (served at /)
│   └── api-server/         # Express API server (served at /api)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Database seed script
```

## Features

### 1. Dashboard
- KPI cards: total projects, active projects, success rate, avg time-to-market, revenue impact, team size
- Charts: projects by stage (bar), projects by status (pie), monthly trends (line)
- Recent projects table

### 2. Project Management
- Full CRUD for projects
- Lifecycle stages: Ideation → Research → Formulation → Testing → Validation → Scale-Up → Commercialization
- Priority levels: Low, Medium, High, Critical
- Status: Active, On Hold, Completed, Cancelled
- Task management per project with kanban-style views
- Lead assignment

### 3. Formulations
- Ingredient composition with percentages and costs
- Sensory evaluation scores (taste, texture, appearance, aroma, overall)
- Shelf-life tracking
- Cost per unit and target margin
- Version management
- Status workflow: Draft → Active → Approved/Rejected

### 4. Analytics Engine
- Trends: success by product category, sensory correlation scatter plot, cost trends
- Cost Simulator: ingredient price change impact analysis with recommendations
- AI Suggestions: formulation recommendations with predicted success rate

### 5. Team Management
- User CRUD with role-based access
- Roles: Admin, Manager, Scientist, Analyst, Viewer
- Department tracking
- Active/Inactive status

### 6. Notifications & Activity
- Notification types: Deadline, Update, Reminder, Mention, System
- Mark as read
- Full activity audit log

### 7. Global Search
- Cross-entity search across projects, formulations, and tasks

## Database Schema

- `users` - User accounts with roles
- `projects` - R&D projects with stages and metadata
- `tasks` - Project tasks with assignees and deadlines
- `formulations` - Formulation records with ingredients (JSONB)
- `notifications` - User notifications
- `activity_logs` - Audit trail

## API Endpoints

All routes prefixed with `/api/`:
- `POST /auth/login` - JWT login
- `GET /auth/me` - Current user
- `GET/POST /users` - User management
- `GET/POST /projects` - Project CRUD
- `GET/POST /tasks` - Task management
- `GET/POST /formulations` - Formulation records
- `GET /analytics/dashboard` - Dashboard KPIs
- `GET /analytics/trends` - Analytics data
- `POST /analytics/cost-simulation` - Cost impact simulation
- `POST /analytics/ai-suggestions` - AI formulation suggestions
- `GET /notifications` - User notifications
- `GET /activity` - Activity logs
- `GET /search` - Global search

## Development Commands

- `pnpm --filter @workspace/api-server run dev` — API server
- `pnpm --filter @workspace/rd-intelligence run dev` — Frontend
- `pnpm --filter @workspace/db run push` — Push DB schema
- `pnpm --filter @workspace/scripts run seed` — Seed demo data
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API client

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json`. The root `tsconfig.json` lists all lib packages as project references.
