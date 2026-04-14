# Zentryx — R&D Intelligence Suite

## Overview

Enterprise-grade R&D management platform for Food Science companies built under the **Zentryx** brand. Full-stack web app with JWT authentication, project lifecycle management, AI-powered analytics (GPT streaming), team management, business development tracking, real-time team chat, and light/dark mode.

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
- **AI**: OpenAI via Replit AI Integrations proxy (GPT streaming SSE)
- **File uploads**: multer (chat images + voice notes)

## Login Credentials (Demo)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rnd.com | admin123 |
| Manager | manager@rnd.com | manager123 |
| Scientist | alice@rnd.com | scientist123 |
| Analyst | carol@rnd.com | analyst123 |

New users can register via the "Create Account" tab on the login page.

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
- KPI cards: total projects, active projects (excludes cancelled/on_hold/pushed_to_live), completed (pushed_to_live), team size (unlimited)
- **Innovation Velocity**: area chart with Weekly/Monthly/Yearly toggle + expand fullscreen button
- **Pipeline Distribution**: Pie / Donut / Bar / Line chart selector + expand fullscreen button
- **Team Overview**: department filter dropdown; List / Pie / Donut / Bar views
- Click team member → view their assigned projects → click project to navigate

### 2. Project Portfolio
- Full CRUD with delete confirmation
- **3 views**: Portfolio (card grid), Matrix (comparison table), List (sortable)
- **Portfolio cards**: circular SVG progress indicator, selling price, monthly revenue display
- Stages: Testing, Reformulation, Innovation, Cost Optimization, Modification
- Status filters: Approved, Awaiting Feedback, On Hold, In Progress, New Inventory, Cancelled, Pushed to Live
- **Product Type filter**: filter by product type + "Group by Type" toggle for grouped layout
- Product types: Seasoning, Snack Dusting, Bread & Dough Premix, Dairy Premix, Functional Blend, Pasta Sauce, Sweet Flavour, Savoury Flavour
- Customer metadata: name, email, phone, cost target, start/due dates
- **Financial fields**: `sellingPrice` (USD $) + `volumeKgPerMonth` — revenue auto-calculated as sellingPrice × volume
- Assignee multi-select from team
- Inline stage/status editing on project detail
- **4 tabs on project detail**: Tasks (kanban), Status Reports, Project Info, Revenue
- **Revenue tab**: digital-screen display showing selling price × volume = monthly/annual revenue
- **Project Info**: Cost Target (USD with currency converter), Selling Price (USD with Naira equivalent), Volume (kg/Month)
- **Template Tasks star button**: creates 13 standard R&D workflow tasks; second click undoes them
- **Default view**: List view (was Portfolio)
- **Matrix view**: clickable rows → project detail, interactive sensory score bars, $ currency; star badge removed from best-score row
- **Export tab**: CSV (`project_export_[date].csv`) + real Excel XLSX (`projects_export_[date].xlsx`) with 18 columns (Tags & Lead columns removed from headers, data, and "What's Included" list)

### 3. Analytics
- Title: "Analytics" with subtitle "Insights, metric and powered analysis for R&D pipeline"
- Overview charts: product category bar, stage distribution (donut/pie/bar toggle + animation), status horizontal bar, Category Performance Radar (radar/bar toggle)
- Expand fullscreen button on all chart cards
- KPI cards: Total Projects, Approved, In Progress, Pushed to Live

### 4. Team Directory
- Add/edit/remove members (admin-only for others; users can edit own profile only)
- Roles: CEO, HR, Head of Department, NPD Technologist, Head of Product Development, Key Account Manager, Senior Key Account Manager, Project Manager, Admin, Quality Control, Graphics Designer, Scientist, Analyst, Viewer + **New Role** button (custom roles persisted to localStorage)
- Department filter bar + create custom departments button
- Unlimited team size (no cap)
- Member metadata: name, email, role, department, country, active status

### 5. Business Development
- Mirrors project structure with full CRUD
- Same product types, stages, statuses, customer metadata
- Inline title editing, status quick-edit on hover

### 6. Chat Room
- Group channels + private direct messages
- Image sharing (upload)
- Voice note recording (Web Audio API → upload)
- Video meeting via Jitsi Meet (opens in new tab)
- Real-time polling every 3 seconds
- Create new group channels with member selection

### 7. Sales Force Module (`/sales-force`)
3 tabs: **Accounts**, **Charts**, **Forecast**

**Accounts tab**: List/Portfolio/Matrix views (default: List), search, filter, sort, CSV/XLSX export, Add Account modal. Click row → Account Detail page.

**Account Detail** (`/sales-force/:id`): 4 sub-tabs — Tasks (Kanban DnD + **Load Template toggle**: click to add 13 template tasks, click again to remove them), Status Report (threaded posts with **@ mention** system: type @name → live dropdown → rendered as purple highlighted text), Production Orders (editable table + 5 charts + resizable split pane), Account Info (full edit form).

**Charts tab**: 4 drilldown charts with bar/pie/list toggle, priority scoring. Bar click on "Accounts by Account Manager" expands inline list of that manager's accounts with navigation links. Fullscreen overlay respects light/dark theme.

**Forecast tab** (full rebuild):
- 3 existing KPI cards (Active Accounts, Monthly Revenue, Total Volume) + 4 new summary cards (Upcoming Orders 30d, Forecast Volume KG, High Confidence Orders, Strategic Customers)
- Filters bar: Company, Product Name, Product Type, Customer Type, Confidence level, Time Range (7/30/90 days), Strategic Only toggle — all filters update table + charts + calendar
- Forecast Table: Company, Product, Last Order Date, Last Order Volume, Forecast Date, Forecast Volume, Confidence (bar + %), Status (click to change: Pending/Confirmed/Probable); row color by confidence (green ≥75%, yellow 50-74%, red <50%)
- Export Forecast button: CSV + XLSX with click-triggered dropdown
- Notify Procurement button: modal with real-time staff search, multi-select, notification title + message input, sends via Zentryx notification system + "Send via Email Client" button opens mailto: with all selected recipients pre-filled. Modal is fully light-mode aware.
- 3 chart panels (Forecast Volume by Month bar/donut/pie, Forecast by Customer pie/bar, Forecast by Product Type donut/pie/bar) — all respect filters
- Forecast Calendar: monthly grid view, events per day color-coded by confidence, prev/next navigation, tooltip on hover, click → detail modal, "+N more" overflow, auto-seeded from accounts. Fully light-mode aware (borders, backgrounds, event chips, tooltip, detail modal).

### 8. Events
- Monthly calendar view + mini sidebar calendar
- **Public Holidays**: fetched from Nager.Date API (`https://date.nager.at/api/v3/PublicHolidays/{year}/{countryCode}`) based on user's country field (defaults to "NG" for Nigeria); holidays highlighted in amber on both calendars + listed in a panel
- Personal event CRUD (add/edit/delete events)

### 9. Weekly Activities Tracker
- Weekly table (Mon–Fri) with rows per team member
- New rows default `assignedUserId: null` — any user can add activities for others
- Columns: Assigned To, Project Title, Product Type, Status, Priority, Remarks
- Notify Account Managers button
- **Dispatch Records tab**: full CRUD, search, sort, pagination, Excel/CSV export, follow-up mail toggle

### 10. Procurement Module (`/procurement`)
4 tabs: **Vendors**, **Purchase Requests**, **Purchase Orders**, **Analytics**

**Access control**: Admin/Manager/CEO/Head roles get full access. "procurement" role sees Procurement + Weekly Activities (not Sales Force, Projects, Business Dev). KAM/SKAM cannot see Procurement.

**Vendors tab**: List/Card view toggle, search by name/contact/country, filter by category and status, sortable table. Columns: Vendor Name, Category, Country, Payment Terms, Rating (5-star display), Active POs count, Total Spend, Status badge. Add Vendor modal with all fields (name, category, contact info, country, address, payment terms, currency, rating 1-5, status, notes). Soft delete (sets status to Inactive).

**Purchase Requests tab**: KPI cards (Total, Pending Approval, Approved This Month, Rejected This Month). Filterable table by status/priority. New Request modal. Click row → detail slide-over with full Approval Chain component (3-level vertical stepper showing approver name+initials, status icon, timestamp, comment). Action buttons: Draft → Submit for Approval; Pending+approver → Approve/Reject; Approved → Convert to PO. Reject requires mandatory comment field.

**Purchase Orders tab**: KPI cards (Total Spend, Open POs, Overdue Deliveries, Spend This Month). Overdue deliveries highlighted in red if > 0. Create PO modal with vendor selector + inline line items (description, qty, unit, unit price). Click row → PO detail panel with: delivery progress stepper (Draft → Sent → Acknowledged → In Transit → Received), line items table, GRN receipts list. Action buttons: Draft → Send to Vendor; Sent/In Transit → Receive Goods modal; Received → Rate Vendor modal (delivery/quality/communication scores 1-5, updates vendor average rating). Excel export.

**Analytics tab**: 4 KPI cards. Charts: Monthly Spend Trend (area chart, last 12 months), Spend by Category (pie/bar toggle), PO Status Distribution (donut), Top Vendors by Spend (horizontal bar). All charts: fullscreen expand, light/dark mode aware, Recharts.

**Notifications**: PR submission notifies all admin/manager/CEO users. PR approval/rejection notifies requester. PO received notifies original PR requester.

### 11. Notifications & Activity
- Notification types: Deadline, Update, Reminder, Mention, System
- Full activity audit log (tracks accounts, projects, business dev, etc.)

## Database Schema

- `users` — User accounts, roles, departments
- `projects` — R&D projects with full metadata, assignees
- `tasks` — Project tasks (kanban)
- `project_comments` — Status reports per project
- `formulations` — Formulation records
- `departments` — Custom department registry
- `business_dev` — Business development opportunities
- `chat_rooms` — Group and private chat rooms
- `chat_room_members` — Room membership
- `chat_messages` — Messages (text/image/voice_note)
- `notifications`, `activity_logs` — Notifications and audit trail
- `vendors` — Vendor registry (name, category, contact, payment terms, currency, rating, status)
- `purchase_requests` — Internal PRs with priority/status/approval workflow
- `purchase_request_approvals` — 3-level approval chain per PR
- `purchase_orders` — POs with poNumber (PO-YYYY-XXXX), status, payment/delivery tracking
- `purchase_order_items` — Line items per PO (description, qty, unit, unit price)
- `purchase_order_receipts` — GRN records (received at, quantity, condition)
- `vendor_performance` — Per-PO delivery/quality/communication scores
- `accounts` — Sales Force account records
- `account_tasks` — Kanban tasks per account
- `account_production_orders` — Production order history per account
- `account_status_reports` — Threaded posts per account
- `account_forecasts` — Forecast entries (auto-seeded + user-editable status/confidence)

## API Endpoints

All routes prefixed with `/api/`:
- `POST /auth/login`, `POST /auth/register`, `GET /auth/me`
- `GET/POST/PUT/DELETE /users`
- `GET/POST/PUT/DELETE /projects`
- `GET/POST /projects/:id/comments`
- `GET/POST /tasks`, `PUT /tasks/:id`
- `GET /analytics/dashboard`, `GET /analytics/trends`
- `GET/POST/PUT/DELETE /business-dev`
- `GET/POST /departments`
- `GET/POST /chat/rooms`
- `GET/POST /chat/rooms/:id/messages`
- `POST /chat/rooms/:id/upload`
- `GET /chat/uploads/:filename` (serve files)
- `GET /chat/users`
- `POST /ai-chat/message` (SSE streaming)
- `GET /notifications`, `GET /activity`, `GET /search`
- `GET/POST/PUT/DELETE /accounts`
- `GET/POST/PUT/DELETE /accounts/:id/tasks`
- `GET/POST/PUT/DELETE /accounts/:id/production-orders`
- `GET/POST /accounts/:id/status-reports`
- `GET/POST/PUT/DELETE /forecasts`
- `POST /forecasts/seed` (auto-generate forecasts from active accounts)
- `POST /forecasts/notify-procurement` (bulk notification to selected staff)
- `GET /weekly-activities/weeks?month=&year=` (auto-generates Mon-Fri weeks for month)
- `PUT /weekly-activities/weeks/:id` (update samplesSent)
- `GET /weekly-activities/weeks/:id/activities` (activities with user info)
- `POST /weekly-activities/weeks/:id/activities` (create activity)
- `PUT /weekly-activities/activities/:id` (update activity)
- `DELETE /weekly-activities/activities/:id`
- `POST /weekly-activities/notify` (notify account managers)

## Theme

- Default: dark mode
- Toggle: sun/moon button in sidebar header
- Light mode: `.light` class on `<html>`

## Development Commands

- `pnpm --filter @workspace/api-server run dev` — API server
- `pnpm --filter @workspace/rd-intelligence run dev` — Frontend
- `pnpm --filter @workspace/db run push` — Push DB schema
- `pnpm --filter @workspace/scripts run seed` — Seed demo data
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API client
