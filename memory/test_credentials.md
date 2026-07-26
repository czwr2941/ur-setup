# UR SETUP OS — Test Credentials

## CEO (Seed Admin — Full Access)
- Email: `ceo@ursetup.com`
- Password: `URSetupOS@2026#Prime`
- Role: **CEO** (all 19 permissions)
- Login URL: `/os/login`

## Login Methods
1. **Email/Password (JWT)** — POST `/api/auth/login`
2. **Google OAuth (Emergent-managed)** — via the "Continue with Google" button
   - New Google users are auto-provisioned as **Pending** role with ZERO permissions
   - They are redirected to `/os/pending` (waiting-for-approval screen)
   - CEO must go to `/os/employees` and change their role to grant access

## Role → Default Permissions
| Role | Permissions |
|---|---|
| CEO | ALL (19) |
| Marketing | dashboard, marketing.*, customers.view, analytics.view |
| Operations | dashboard, orders.*, customers.*, products.view |
| Tech & Sales | dashboard, analytics, products.*, integrations, settings.view |
| Support | dashboard, support.*, customers.view |
| Pending | (none — awaiting approval) |

## Per-User Permission Overrides
CEO can open Employees → click "الصلاحيات" (Permissions) → check any combination of the 19 permissions and save. When custom permissions are set, `permissions_customized: true` is stored so the user gets exactly what CEO picks (not the role defaults). Clicking "reset to role default" clears the customization and the user picks up their role's defaults again.

## Key OS Endpoints
- `GET  /api/os/me` — current user + `permissions_effective`
- `PATCH /api/os/preferences` — save language / theme
- `GET  /api/os/employees` — list (requires `employees.view`)
- `POST /api/os/employees` — create (requires `employees.manage`)
- `PATCH /api/os/employees/{uid}` — update role/permissions/name (auto-resets perms on role change)
- `DELETE /api/os/employees/{uid}` — delete
- `GET  /api/os/permissions-catalog` — full catalog + role defaults
- `GET  /api/os/roles` + `PUT /api/os/roles/{name}` — edit role permissions
- `GET  /api/os/activity-logs` — CEO only
- `GET  /api/os/dashboard/summary` — dashboard data
- `POST /api/os/tasks` — create task (requires `tasks.assign` to assign to others)
- `GET  /api/os/employees/lookup` — light employee list for task assignment
- `POST /api/os/auth/google/session` — Google OAuth exchange

## Live-Refresh
Client polls `/api/os/me` every 10s so any permission/role change is reflected within 10s in the sidebar without reload.
