# UR SETUP OS — Test Credentials

## CEO (Seed Admin — Full Access)
- Email: `ceo@ursetup.com`
- Password: `URSetupOS@2026#Prime`
- Role: **CEO** (all permissions)
- Login: `/os/login` — email/password OR "Continue with Google"

## Test Employee (Operations)
- Email: `ops@ursetup.com`
- Password: `Ops12345`
- Role: **Operations** (dashboard, orders, customers, products)
- Cannot access: activity logs, employees management, settings.manage

## Available Login Methods
1. **Email/Password JWT** — POST `/api/auth/login`
2. **Google OAuth (Emergent-managed)** — Redirects to Emergent auth then back to `/os#session_id=...` → handled by `OSAuthCallback` → POST `/api/os/auth/google/session`
   - New Google users are auto-provisioned as **Support** role with empty permissions (CEO must approve/upgrade)

## Key Endpoints
- `GET  /api/os/me` — current user + permissions_effective
- `PATCH /api/os/preferences` — save language / theme
- `GET  /api/os/employees` — list (requires `employees.view`)
- `POST /api/os/employees` — create (requires `employees.manage`)
- `GET  /api/os/activity-logs` — CEO only (requires `logs.view`)
- `GET  /api/os/dashboard/summary` — dashboard data
- `GET  /api/os/dashboard/online-employees` — CEO only
- `POST /api/os/tasks`, `PATCH /api/os/tasks/{id}`, `DELETE /api/os/tasks/{id}`

## Storefront Legacy Admin (still functional)
- URL: `/admin/login`
- Same CEO credentials — CEO role is granted full legacy `super_admin` access via permission catalog.
