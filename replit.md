# Zentryx — R&D Intelligence Suite

## Overview

Zentryx is an enterprise-grade R&D management platform designed for Food Science companies. It's a full-stack web application offering comprehensive project lifecycle management, AI-powered analytics, team collaboration tools, business development tracking, and real-time communication. The platform aims to streamline R&D processes, enhance decision-making through data-driven insights, and foster innovation within the food science industry.

## User Preferences

- The user prefers clear and concise communication.
- The user prefers an iterative development approach.
- The user wants to be asked before any major changes are made to the codebase or architecture.
- The user prefers that explanations are detailed and provide context.

## System Architecture

The project is structured as a monorepo using `pnpm workspaces`.

**Technology Stack:**
- **Frontend**: React, Vite, TailwindCSS, Framer Motion, Recharts, Zustand.
- **Backend**: Node.js 24, Express 5.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: JWT (bcryptjs, jsonwebtoken).
- **Validation**: Zod.
- **API Codegen**: Orval from OpenAPI spec.
- **AI Integration**: OpenAI (GPT streaming SSE) via Replit AI Integrations proxy.
- **File Uploads**: Multer.

**UI/UX and Theming:**
- Features both light and dark modes, with dark mode as the default. The theme can be toggled via a sun/moon button.

**Core Features and Modules:**

1.  **Dashboard**: Provides key performance indicators (KPIs) for projects and team overview, including innovation velocity and pipeline distribution charts.
2.  **Project Portfolio**: Manages R&D projects with full CRUD functionality. Offers multiple views (card grid, matrix, list) and advanced filtering by stage, status, and product type. Includes detailed project information, task management (Kanban), status reports, and revenue tracking. Supports CSV and XLSX export.
3.  **Analytics**: Offers insights into R&D pipeline performance through various charts like product category bars, stage distribution, and status analysis.
4.  **Team Directory**: Facilitates team management with add/edit/remove member functionalities, role assignments, department filtering, and custom roles.
5.  **Business Development**: Mirrors the project structure for tracking business development opportunities.
6.  **Chat Room**: Provides real-time group and direct messaging, supporting image sharing, voice notes, and video meetings (Jitsi Meet integration).
7.  **Sales Force Module**: Comprehensive sales management with Accounts, Charts, and Forecast tabs.
    -   **Accounts**: CRUD for sales accounts with task management (Kanban with template tasks), threaded status reports (`@mention` system), production orders, and account info.
    -   **Charts**: Drilldown charts for sales performance analysis.
    -   **Forecast**: Advanced forecasting system with KPI cards, extensive filtering, a forecast table with confidence scoring, and integrated notification for procurement. Includes interactive charts and a calendar view.
8.  **Events**: A calendar module for managing personal events and displaying public holidays fetched from an external API.
9.  **Weekly Activities Tracker**: Enables tracking weekly activities for team members, including dispatch records with CRUD, search, sort, pagination, and export.
10. **Procurement Module**: Manages procurement processes with Vendors, Purchase Requests, Purchase Orders, and Analytics tabs.
    -   **Access Control**: Role-based access (Admin, Manager, CEO, Head roles for full access; 'procurement' role for specific access).
    -   **Vendors**: CRUD for vendor management, including ratings and status tracking.
    -   **Purchase Requests**: Manages PRs with an approval workflow, KPI cards, and status tracking.
    -   **Purchase Orders**: Manages POs, including delivery tracking, goods receipt notes (GRN), and vendor performance ratings.
    -   **Analytics**: Provides KPI cards and charts for procurement spend analysis.
    -   **Notifications**: Automated notifications for PR submissions, approvals, rejections, and PO receipts.
11. **Notifications & Activity**: Centralized system for notifications (deadline, update, reminder, mention, system) and a full activity audit log across the platform.

**Database Schema Highlights:**
-   `users`: User accounts, roles, departments.
-   `projects`: R&D projects with metadata and assignees.
-   `tasks`: Project and account tasks.
-   `business_dev`: Business development opportunities.
-   `chat_rooms`, `chat_messages`: Real-time chat infrastructure.
-   `notifications`, `activity_logs`: System alerts and audit trail.
-   `vendors`, `purchase_requests`, `purchase_orders`: Procurement management.
-   `accounts`, `account_production_orders`, `account_forecasts`: Sales force management.

## External Dependencies

-   **OpenAI API**: Utilized for AI-powered analytics and GPT streaming, accessed via Replit AI Integrations proxy.
-   **Nager.Date API**: Used to fetch public holidays based on country codes for the Events module (`https://date.nager.at/api/v3/PublicHolidays/{year}/{countryCode}`).
-   **Jitsi Meet**: Integrated for video conferencing within the chat module.