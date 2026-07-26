# UR SETUP OS — Product Requirements Document

## Original Problem Statement
Client (UR SETUP, Saudi e-commerce brand) requested a **separate** internal operating system called **UR SETUP OS** — distinct from the customer-facing Salla store — that acts as the central control panel for the entire company. Must be scalable, modular, bilingual (AR/EN with RTL/LTR), themable (dark/light), with RBAC, activity logs, and integration-ready structure. Foundation must be strong enough that future modules can be added without restructuring.

## Architecture
- **Frontend**: React 18 + react-router-dom + Tailwind + lucide-react + sonner
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + bcrypt + httpx
- **Auth**: Dual — JWT (email/password) + Emergent Google OAuth session
- **RBAC**: Permission catalog (18 permissions) + roles map to permissions. Roles editable. Users can have per-user permission overrides.
- **Structure**: Modular monolith. Each module (Dashboard, Orders, Customers, Products, Marketing, Support, Employees, Analytics, Logs, Settings) is a self-contained route + page in `/frontend/src/os/pages/` and a router in `/backend/server.py`. Adding a new module = add a page + register in NAV + optionally add API router.

## User Personas
1. **CEO / Owner** — sees everything, manages employees & roles, only role with `logs.view` (activity logs) and `logs.view`-gated widgets (who's online).
2. **Marketing** — dashboard + marketing + customers view + analytics.
3. **Operations** — dashboard + orders + customers + products view.
4. **Tech & Sales** — dashboard + analytics + products + integrations + settings view.
5. **Support (دعم فني)** — dashboard + support + customers view.

## Core Requirements (Static)
- Bilingual AR/EN with per-user preference stored in DB.
- Dark & light themes with per-user preference.
- RTL/LTR automatic based on language.
- Sidebar navigation filtered by permissions.
- Time-of-day greeting (صباح الخير / مساء الخير / Good morning / afternoon / evening).
- Activity logging for every mutating action (create, update, delete, login, task complete).
- Online presence tracking (`last_seen`, `status`).
- Placeholder modules for future work (Orders, Customers, Products, Marketing, Support, Analytics) using consistent layout.

## What's Been Implemented (2026-07-26)

### Backend (`/api/os/*`)
- JWT login (`/api/auth/login`) + Emergent Google session exchange (`/api/os/auth/google/session`)
- `get_current_user` accepts both JWT tokens and Emergent session_tokens (Bearer or Cookie)
- Employees CRUD (`/api/os/employees`) with permission gates
- Roles CRUD (`/api/os/roles`) with permission catalog exposed
- Tasks CRUD (`/api/os/tasks`) — user-scoped
- Activity logs (`/api/os/activity-logs`) — CEO only (`logs.view`)
- Dashboard summary + online employees + recent activity
- User preferences (`/api/os/preferences`) — language & theme
- Auto-seed CEO with all permissions on startup (idempotent)

### Frontend (`/os/*` routes)
- `/os/login` — bilingual login page with Google button
- `/os` — Dashboard (welcome, metrics, quick actions, tasks, online employees / recent activity, integrations placeholder)
- `/os/employees` — list, add (permission-gated), inline role change, delete
- `/os/logs` — Activity Logs table (CEO only)
- `/os/settings` — profile view, language toggle (AR/EN), theme toggle (dark/light)
- `/os/{orders,customers,products,marketing,support,analytics}` — consistent "Coming Soon" placeholders inside the same shell
- Language + Theme + Auth contexts. RTL automatic on `dir="rtl"`.
- Google OAuth callback handled at `/os#session_id=...` synchronously (no race condition)

### Preserved (unchanged)
- Public storefront (`/`) and legacy studio admin (`/admin/*`) fully intact.

## Prioritized Backlog (P0 = next)
- **P0** — Roles & Permissions editor UI in Settings (backend already supports it)
- **P0** — Notifications center (bell icon backend exists via `/api/notifications` design; UI to be added)
- **P1** — Salla integration: Orders, Customers, Products modules pull real data
- **P1** — WhatsApp integration: Support module with in-app inbox
- **P1** — Analytics module: charts (top products, revenue trend, employee performance)
- **P2** — Shift management (start/end shift, work hours log)
- **P2** — Email integration (SendGrid/Resend) for notifications
- **P2** — Mobile app (React Native / PWA) reusing same API

## Next Task List
1. Roles & Permissions editor with drag-drop or checkbox matrix
2. In-app notifications panel wired to the bell icon
3. Salla API adapter — start with Orders read-only
4. WhatsApp adapter (integration_playbook_expert_v2 for chosen provider)

## Deployment Notes
- MongoDB `DB_NAME=ursetup_db`
- Seed CEO env: `ADMIN_EMAIL`, `ADMIN_PASSWORD` (rotated on startup if changed)
- JWT `HS256` with `JWT_SECRET` from env
- All backend routes `/api/*`
