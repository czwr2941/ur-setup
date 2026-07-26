"""UR SETUP OS — Internal company operating system backend.

Modules: Auth (JWT + Emergent Google), Employees, RBAC, Dashboard, Activity Logs.
All routes prefixed with /api. Modular by design — new modules can be added by
mounting a new router and (optionally) new permissions.
"""
from dotenv import load_dotenv
load_dotenv()

import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
import httpx
from fastapi import FastAPI, HTTPException, APIRouter, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"

# --- Role & Permission catalog (mirror on frontend) ---
ROLES_DEFAULT = ["CEO", "Marketing", "Operations", "Tech & Sales", "Support"]

# Permissions are simple string keys. Modules check `has_perm(user, "orders.view")`.
PERMISSIONS_CATALOG = {
    "dashboard.view":   "View dashboard",
    "orders.view":      "View orders",
    "orders.manage":    "Manage orders",
    "customers.view":   "View customers",
    "customers.manage": "Manage customers",
    "products.view":    "View products",
    "products.manage":  "Manage products",
    "marketing.view":   "View marketing",
    "marketing.manage": "Manage marketing",
    "support.view":     "View support",
    "support.manage":   "Manage support",
    "employees.view":   "View employees",
    "employees.manage": "Manage employees (add, edit, delete)",
    "analytics.view":   "View analytics",
    "logs.view":        "View activity logs (manager only)",
    "settings.view":    "View settings",
    "settings.manage":  "Manage system settings",
    "integrations.manage": "Manage integrations",
}

DEFAULT_ROLE_PERMS = {
    "CEO": list(PERMISSIONS_CATALOG.keys()),  # everything
    "Marketing": ["dashboard.view", "marketing.view", "marketing.manage",
                  "customers.view", "analytics.view"],
    "Operations": ["dashboard.view", "orders.view", "orders.manage",
                   "customers.view", "customers.manage", "products.view"],
    "Tech & Sales": ["dashboard.view", "analytics.view", "products.view",
                     "products.manage", "integrations.manage", "settings.view"],
    "Support": ["dashboard.view", "support.view", "support.manage",
                "customers.view"],
}

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="UR SETUP OS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])
emp_router = APIRouter(prefix="/api/employees", tags=["employees"])
roles_router = APIRouter(prefix="/api/roles", tags=["roles"])
logs_router = APIRouter(prefix="/api/activity-logs", tags=["logs"])
dash_router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
tasks_router = APIRouter(prefix="/api/tasks", tags=["tasks"])
notif_router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# ============ Helpers ============
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role, "type": "access",
        "exp": _now() + timedelta(hours=12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _clean_user(doc: dict) -> dict:
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


async def _resolve_user_from_jwt(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            return None
        user = await db.users.find_one({"id": payload["sub"]})
        return user
    except jwt.PyJWTError:
        return None


async def _resolve_user_from_session_token(token: str) -> Optional[dict]:
    """Emergent Google Auth session_token stored in db.user_sessions."""
    sess = await db.user_sessions.find_one({"session_token": token})
    if not sess:
        return None
    expires = sess.get("expires_at")
    if isinstance(expires, str):
        try:
            expires = datetime.fromisoformat(expires)
        except Exception:
            return None
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires and expires < _now():
        return None
    user = await db.users.find_one({"id": sess["user_id"]})
    return user


async def get_current_user(request: Request) -> dict:
    # 1. Authorization: Bearer <token>  (JWT or Emergent session)
    auth = request.headers.get("Authorization", "")
    token = None
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
    # 2. Cookie fallback (session_token from Emergent OAuth)
    if not token:
        token = request.cookies.get("session_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await _resolve_user_from_jwt(token)
    if not user:
        user = await _resolve_user_from_session_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Touch last_seen for online tracking
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_seen": _now_iso(), "status": "online"}},
    )
    return _clean_user(user)


def _perms_for(user: dict) -> List[str]:
    if user.get("permissions"):
        return user["permissions"]
    return DEFAULT_ROLE_PERMS.get(user.get("role", ""), [])


def require_perm(*perms: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        user_perms = set(_perms_for(user))
        if not any(p in user_perms for p in perms):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _dep


def require_role(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return _dep


async def log_activity(user: dict, action: str, module: str,
                       target: Optional[str] = None, meta: Optional[dict] = None):
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name"),
        "user_email": user.get("email"),
        "role": user.get("role"),
        "action": action,
        "module": module,
        "target": target,
        "meta": meta or {},
        "created_at": _now_iso(),
    })


# ============ Models ============
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class EmployeeCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=80)
    role: str = Field(default="Support")
    language: Literal["ar", "en"] = "ar"
    permissions: Optional[List[str]] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    language: Optional[Literal["ar", "en"]] = None
    password: Optional[str] = None


class PreferencesUpdate(BaseModel):
    language: Optional[Literal["ar", "en"]] = None
    theme: Optional[Literal["light", "dark"]] = None


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    assigned_to: Optional[str] = None
    due_at: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    done: Optional[bool] = None
    assigned_to: Optional[str] = None
    due_at: Optional[str] = None


class RoleUpsert(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    permissions: List[str]
    description: Optional[str] = ""


# ============ Auth routes ============
@auth_router.post("/login")
async def login(payload: LoginIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    await db.users.update_one({"id": user["id"]},
                              {"$set": {"last_seen": _now_iso(), "status": "online"}})
    await log_activity(user, "logged_in", "auth")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _clean_user(user),
    }


@auth_router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]},
                              {"$set": {"status": "offline", "last_seen": _now_iso()}})
    await log_activity(user, "logged_out", "auth")
    # For Emergent OAuth users, also destroy session
    await db.user_sessions.delete_many({"user_id": user["id"]})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@auth_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {**user, "permissions_effective": _perms_for(user)}


@auth_router.patch("/preferences")
async def update_prefs(payload: PreferencesUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]})
    return _clean_user(fresh)


@auth_router.post("/google/session")
async def google_session(request: Request, response: Response):
    """Exchange Emergent Google Auth session_id for our internal session.
    Creates or links a user by email.
    """
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
        session_id = (body or {}).get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    # Call Emergent Auth session-data endpoint
    async with httpx.AsyncClient(timeout=10) as hc:
        r = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = r.json()
    email = (data.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Session missing email")

    existing = await db.users.find_one({"email": email})
    if existing is None:
        # Auto-provision as Support with default permissions.
        # CEO must approve/upgrade role from the Employees module.
        new_user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"),
            "role": "Support",
            "permissions": [],
            "language": "ar",
            "theme": "dark",
            "auth_provider": "google",
            "status": "online",
            "last_seen": _now_iso(),
            "created_at": _now_iso(),
        }
        await db.users.insert_one(new_user)
        user = new_user
        await log_activity(user, "user_provisioned_via_google", "auth")
    else:
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "picture": data.get("picture") or existing.get("picture"),
                "status": "online",
                "last_seen": _now_iso(),
            }},
        )
        user = await db.users.find_one({"email": email})

    # Save Emergent session token
    session_token = data.get("session_token")
    expires_at = _now() + timedelta(days=7)
    if session_token:
        await db.user_sessions.insert_one({
            "user_id": user["id"],
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": _now_iso(),
        })
        response.set_cookie(
            key="session_token", value=session_token,
            httponly=True, secure=True, samesite="none",
            max_age=7 * 24 * 3600, path="/",
        )

    # Also issue our JWT so the app can use it uniformly
    jwt_token = create_access_token(user["id"], user["email"], user["role"])
    await log_activity(user, "logged_in_google", "auth")
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "user": _clean_user(user),
    }


# ============ Employees routes ============
@emp_router.get("")
async def list_employees(_: dict = Depends(require_perm("employees.view"))):
    cursor = db.users.find({}).sort("created_at", -1)
    out = []
    async for doc in cursor:
        out.append(_clean_user(doc))
    return out


@emp_router.post("", status_code=201)
async def create_employee(payload: EmployeeCreate,
                          actor: dict = Depends(require_perm("employees.manage"))):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "role": payload.role,
        "permissions": payload.permissions or [],
        "language": payload.language,
        "theme": "dark",
        "password_hash": hash_password(payload.password),
        "auth_provider": "password",
        "status": "offline",
        "last_seen": None,
        "created_at": _now_iso(),
    }
    await db.users.insert_one(dict(doc))
    await log_activity(actor, "employee_created", "employees", target=doc["id"],
                       meta={"email": email, "role": doc["role"]})
    return _clean_user(doc)


@emp_router.patch("/{uid}")
async def update_employee(uid: str, payload: EmployeeUpdate,
                          actor: dict = Depends(require_perm("employees.manage"))):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "password" in updates:
        pwd = updates.pop("password")
        if len(pwd) < 6:
            raise HTTPException(status_code=400, detail="Password too short")
        updates["password_hash"] = hash_password(pwd)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    r = await db.users.update_one({"id": uid}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    await log_activity(actor, "employee_updated", "employees", target=uid,
                       meta={"fields": list(updates.keys())})
    return {"ok": True}


@emp_router.delete("/{uid}")
async def delete_employee(uid: str,
                          actor: dict = Depends(require_perm("employees.manage"))):
    if uid == actor["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    r = await db.users.delete_one({"id": uid})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    await log_activity(actor, "employee_deleted", "employees", target=uid)
    return {"ok": True}


# ============ Roles routes ============
@roles_router.get("")
async def list_roles(_: dict = Depends(get_current_user)):
    cursor = db.roles.find({}).sort("name", 1)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return {"roles": out, "permissions_catalog": PERMISSIONS_CATALOG}


@roles_router.put("/{name}")
async def upsert_role(name: str, payload: RoleUpsert,
                      actor: dict = Depends(require_perm("settings.manage"))):
    # Validate permissions
    invalid = [p for p in payload.permissions if p not in PERMISSIONS_CATALOG]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid permissions: {invalid}")
    await db.roles.update_one(
        {"name": name},
        {"$set": {"name": name, "permissions": payload.permissions,
                  "description": payload.description or "",
                  "updated_at": _now_iso()},
         "$setOnInsert": {"created_at": _now_iso()}},
        upsert=True,
    )
    await log_activity(actor, "role_upserted", "settings", target=name,
                       meta={"perms_count": len(payload.permissions)})
    return {"ok": True}


@roles_router.delete("/{name}")
async def delete_role(name: str,
                      actor: dict = Depends(require_perm("settings.manage"))):
    if name in ROLES_DEFAULT:
        raise HTTPException(status_code=400, detail="Cannot delete default role")
    r = await db.roles.delete_one({"name": name})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    await log_activity(actor, "role_deleted", "settings", target=name)
    return {"ok": True}


# ============ Activity Logs (CEO only) ============
@logs_router.get("")
async def list_logs(limit: int = 100,
                    _: dict = Depends(require_perm("logs.view"))):
    cursor = db.activity_logs.find({}).sort("created_at", -1).limit(min(limit, 500))
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return out


# ============ Tasks ============
@tasks_router.get("")
async def list_tasks(user: dict = Depends(get_current_user)):
    query = {"$or": [{"assigned_to": user["id"]}, {"created_by": user["id"]}]}
    cursor = db.tasks.find(query).sort("created_at", -1).limit(200)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return out


@tasks_router.post("", status_code=201)
async def create_task(payload: TaskCreate, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "title": payload.title,
        "assigned_to": payload.assigned_to or user["id"],
        "created_by": user["id"],
        "due_at": payload.due_at,
        "done": False,
        "created_at": _now_iso(),
    }
    await db.tasks.insert_one(dict(doc))
    await log_activity(user, "task_created", "tasks", target=doc["id"],
                       meta={"title": payload.title})
    doc.pop("_id", None)
    return doc


@tasks_router.patch("/{tid}")
async def update_task(tid: str, payload: TaskUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields")
    r = await db.tasks.update_one({"id": tid}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    if "done" in updates and updates["done"]:
        await log_activity(user, "task_completed", "tasks", target=tid)
    return {"ok": True}


@tasks_router.delete("/{tid}")
async def delete_task(tid: str, user: dict = Depends(get_current_user)):
    r = await db.tasks.delete_one({"id": tid})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    await log_activity(user, "task_deleted", "tasks", target=tid)
    return {"ok": True}


# ============ Notifications ============
@notif_router.get("")
async def list_notifications(user: dict = Depends(get_current_user)):
    cursor = db.notifications.find(
        {"$or": [{"user_id": user["id"]}, {"user_id": None}]}
    ).sort("created_at", -1).limit(50)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return out


@notif_router.post("/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid}, {"$addToSet": {"read_by": user["id"]}})
    return {"ok": True}


# ============ Dashboard ============
@dash_router.get("/summary")
async def dashboard_summary(user: dict = Depends(require_perm("dashboard.view"))):
    total_employees = await db.users.count_documents({})
    online_employees = await db.users.count_documents({"status": "online"})
    pending_tasks = await db.tasks.count_documents({"assigned_to": user["id"], "done": False})
    open_notifs = await db.notifications.count_documents({"user_id": user["id"]})
    # Placeholders (will bind to Salla later)
    return {
        "orders_today": 0,
        "revenue_today": 0,
        "new_customers": 0,
        "pending_orders": 0,
        "total_employees": total_employees,
        "online_employees": online_employees,
        "pending_tasks": pending_tasks,
        "unread_notifications": open_notifs,
        "integration_status": {
            "salla": "not_connected",
            "whatsapp": "not_connected",
            "email": "not_connected",
        },
    }


@dash_router.get("/online-employees")
async def online_employees(_: dict = Depends(require_perm("logs.view"))):
    """Only CEO / users with logs.view can see who's online."""
    cursor = db.users.find({"status": "online"}).sort("last_seen", -1)
    out = []
    async for doc in cursor:
        out.append(_clean_user(doc))
    return out


@dash_router.get("/recent-activity")
async def recent_activity(limit: int = 8, user: dict = Depends(get_current_user)):
    """Everyone can see their own last activity. CEO sees all."""
    query = {} if "logs.view" in _perms_for(user) else {"user_id": user["id"]}
    cursor = db.activity_logs.find(query).sort("created_at", -1).limit(min(limit, 50))
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return out


# ============ Root ============
@api.get("/")
async def root():
    return {"service": "UR SETUP OS", "status": "ok", "version": "1.0.0"}


@api.get("/permissions-catalog")
async def get_perms_catalog(_: dict = Depends(get_current_user)):
    return {"catalog": PERMISSIONS_CATALOG, "default_role_perms": DEFAULT_ROLE_PERMS}


# ============ Startup / Seed ============
@app.on_event("startup")
async def _startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.activity_logs.create_index("created_at")
    await db.activity_logs.create_index("user_id")
    await db.tasks.create_index("assigned_to")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.roles.create_index("name", unique=True)

    # Seed default roles (idempotent)
    for role_name in ROLES_DEFAULT:
        await db.roles.update_one(
            {"name": role_name},
            {"$set": {"name": role_name,
                      "permissions": DEFAULT_ROLE_PERMS.get(role_name, []),
                      "updated_at": _now_iso()},
             "$setOnInsert": {"created_at": _now_iso(),
                              "description": f"Default {role_name} role"}},
            upsert=True,
        )

    # Seed CEO
    admin_email = os.environ.get("ADMIN_EMAIL", "ceo@ursetup.com").lower().strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "URSetupOS@2026#Prime")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "UR SETUP CEO",
            "role": "CEO",
            "permissions": list(PERMISSIONS_CATALOG.keys()),
            "language": "ar",
            "theme": "dark",
            "password_hash": hash_password(admin_password),
            "auth_provider": "password",
            "status": "offline",
            "last_seen": None,
            "created_at": _now_iso(),
        })
    else:
        # Refresh hash if changed, and guarantee CEO has all perms
        needs = {}
        if not verify_password(admin_password, existing.get("password_hash", "")):
            needs["password_hash"] = hash_password(admin_password)
        needs["role"] = "CEO"
        needs["permissions"] = list(PERMISSIONS_CATALOG.keys())
        await db.users.update_one({"email": admin_email}, {"$set": needs})


# Mount routers
app.include_router(api)
app.include_router(auth_router)
app.include_router(emp_router)
app.include_router(roles_router)
app.include_router(logs_router)
app.include_router(dash_router)
app.include_router(tasks_router)
app.include_router(notif_router)
