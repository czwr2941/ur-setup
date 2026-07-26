import React, { useMemo, useState, useEffect } from "react";
import { NavLink, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingBag, Users, Package, Megaphone, LifeBuoy,
  UserCog, BarChart3, ScrollText, Settings, LogOut, Sun, Moon, Globe,
  Bell, Menu, X, ShieldCheck, ExternalLink,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { OS_T } from "./i18n";
import { osApi } from "./api";

const NAV = [
  { to: "/os", end: true, key: "dashboard", Icon: LayoutDashboard, perm: "dashboard.view" },
  { to: "/os/orders", key: "orders", Icon: ShoppingBag, perm: "orders.view" },
  { to: "/os/customers", key: "customers", Icon: Users, perm: "customers.view" },
  { to: "/os/products", key: "products", Icon: Package, perm: "products.view" },
  { to: "/os/marketing", key: "marketing", Icon: Megaphone, perm: "marketing.view" },
  { to: "/os/support", key: "support", Icon: LifeBuoy, perm: "support.view" },
  { to: "/os/employees", key: "employees", Icon: UserCog, perm: "employees.view" },
  { to: "/os/analytics", key: "analytics", Icon: BarChart3, perm: "analytics.view" },
  { to: "/os/logs", key: "logs", Icon: ScrollText, perm: "logs.view" },
  { to: "/os/settings", key: "settings", Icon: Settings, perm: "settings.view" },
];

export default function OSLayout() {
  const { user, loading, logout, setUser } = useAuth();
  const { lang, set: setLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const t = OS_T[lang];
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const outletContext = useMemo(() => ({ user, t, lang, theme }), [user, t, lang, theme]);

  // Apply user's saved preferences and enrich with OS permissions once
  useEffect(() => {
    if (user?.language && user.language !== lang) setLang(user.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.language]);

  useEffect(() => {
    // If user has no permissions loaded (legacy /auth/me), fetch OS /me
    if (user && !user.permissions_effective) {
      osApi.get("/me").then((r) => setUser({ ...user, ...r.data })).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">…</div>;
  if (!user) return <Navigate to="/os/login" replace />;

  const perms = user.permissions_effective || user.permissions || [];
  const items = NAV.filter((n) => perms.includes(n.perm));

  const persistPref = async (patch) => {
    try {
      const { data } = await osApi.patch("/preferences", patch);
      setUser({ ...user, ...data });
    } catch (e) { /* ignore */ }
  };

  const onLangChange = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    persistPref({ language: next });
  };
  const onThemeChange = () => {
    toggleTheme();
    persistPref({ theme: theme === "dark" ? "light" : "dark" });
  };

  const isDark = theme === "dark";
  const shellBg = isDark ? "bg-[#0B0F19]" : "bg-[#F8FAFC]";
  const shellText = isDark ? "text-slate-100" : "text-slate-900";
  const sideBg = isDark ? "bg-[#0d1220]" : "bg-white";
  const sideBorder = isDark ? "border-white/8" : "border-slate-200";
  const barBg = isDark ? "bg-[#0B0F19]/85 border-white/8" : "bg-white/90 border-slate-200";

  const Sidebar = (
    <div className={`w-64 shrink-0 border-e ${sideBorder} ${sideBg} flex flex-col`}>
      <div className={`px-6 py-5 border-b ${sideBorder} flex items-center gap-3`}>
        <div className={`w-9 h-9 rounded-lg ${isDark ? "bg-blue-500/15" : "bg-blue-50"} flex items-center justify-center`}>
          <ShieldCheck className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
        </div>
        <div>
          <p className="font-semibold tracking-tight">UR SETUP OS</p>
          <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${isDark ? "text-slate-500" : "text-slate-500"}`}>{t.tagline}</p>
        </div>
      </div>
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end}
            data-testid={`os-nav-${it.key}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors duration-200 ${
                isActive
                  ? isDark ? "bg-blue-500/12 text-white border-s-2 border-blue-500" : "bg-blue-50 text-blue-700 border-s-2 border-blue-600"
                  : isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`
            }>
            <it.Icon className="w-4 h-4" />
            <span>{t.nav[it.key]}</span>
          </NavLink>
        ))}
        <a href="/" target="_blank" rel="noreferrer"
          className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-md ${isDark ? "text-slate-500 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"} transition-colors duration-200`}>
          <ExternalLink className="w-4 h-4" /><span>{t.nav.store}</span>
        </a>
      </nav>
      <div className={`px-4 py-4 border-t ${sideBorder}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"} flex items-center justify-center font-semibold`}>
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm truncate">{user.name}</p>
            <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{user.role}</p>
          </div>
        </div>
        <button onClick={() => { logout(); navigate("/os/login", { replace: true }); }}
          data-testid="os-logout"
          className={`mt-3 w-full inline-flex items-center gap-2 justify-center border ${isDark ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-100"} py-2 text-xs uppercase tracking-widest rounded-md transition-colors duration-200`}>
          <LogOut className="w-3.5 h-3.5" /> {t.nav.logout}
        </button>
      </div>
    </div>
  );

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className={`${shellBg} ${shellText} min-h-screen flex`} data-testid="os-shell">
      <aside className="hidden lg:flex">{Sidebar}</aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute inset-y-0 start-0 flex" onClick={(e) => e.stopPropagation()}>{Sidebar}</div>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <header className={`sticky top-0 z-30 border-b ${barBg} backdrop-blur px-4 lg:px-8 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)} data-testid="os-mobile-menu">
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-sm font-medium">{t.app_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLangChange} data-testid="os-lang-toggle"
              className={`inline-flex items-center gap-1.5 border ${isDark ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-100"} px-2.5 py-1.5 text-xs rounded-md transition-colors duration-200`}>
              <Globe className="w-3.5 h-3.5" /> {lang === "ar" ? "EN" : "AR"}
            </button>
            <button onClick={onThemeChange} data-testid="os-theme-toggle"
              className={`inline-flex items-center border ${isDark ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-100"} p-1.5 rounded-md transition-colors duration-200`}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className={`inline-flex items-center border ${isDark ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-100"} p-1.5 rounded-md transition-colors duration-200`}
              data-testid="os-notif-btn">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>
        <div className="p-4 lg:p-8 flex-1 min-w-0">
          <Outlet context={outletContext} />
        </div>
      </main>
    </div>
  );
}
