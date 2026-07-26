import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Sun, Moon, Globe, User, ShieldCheck, Save } from "lucide-react";
import { useLang } from "../../contexts/LangContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { osApi } from "../api";

export default function OSSettings() {
  const { t, k, perms } = useOutletContext();
  const { lang, set: setLang } = useLang();
  const { theme: currentTheme, setTheme } = useTheme();
  const { user, setUser } = useAuth();
  const canManageRoles = perms.includes("settings.manage");

  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [selectedRole, setSelectedRole] = useState("");
  const [editing, setEditing] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    if (!canManageRoles) return;
    try {
      const r = await osApi.get("/roles");
      setRoles(r.data.roles);
      setCatalog(r.data.permissions_catalog);
      if (!selectedRole && r.data.roles.length) {
        const first = r.data.roles.find((x) => x.name !== "Pending") || r.data.roles[0];
        setSelectedRole(first.name);
        setEditing(first.permissions || []);
      }
    } catch (e) { /* ignore */ }
  }, [canManageRoles, selectedRole]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const selectRole = (name) => {
    setSelectedRole(name);
    const r = roles.find((x) => x.name === name);
    setEditing(r?.permissions || []);
  };

  const savePref = async (patch) => {
    try {
      const { data } = await osApi.patch("/preferences", patch);
      setUser({ ...user, ...data });
      toast.success(t.common.updated);
    } catch { toast.error(t.common.failed); }
  };

  const saveRole = async () => {
    setSaving(true);
    try {
      await osApi.put(`/roles/${encodeURIComponent(selectedRole)}`, {
        name: selectedRole,
        permissions: editing,
        description: "",
      });
      toast.success(t.common.updated);
      loadRoles();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : t.common.failed);
    } finally { setSaving(false); }
  };

  return (
    <div data-testid="os-settings" className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.settings.title}</h1>
      </div>

      <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <User className={`w-4 h-4 ${k.muted}`} />
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.settings.profile}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div><p className={`text-xs ${k.muted}`}>{t.employees.name}</p><p>{user?.name}</p></div>
          <div><p className={`text-xs ${k.muted}`}>{t.employees.email}</p><p>{user?.email}</p></div>
          <div><p className={`text-xs ${k.muted}`}>{t.employees.role}</p><p>{user?.role}</p></div>
        </div>
      </div>

      <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className={`w-4 h-4 ${k.muted}`} />
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.settings.language}</p>
        </div>
        <div className="flex gap-2">
          {["ar", "en"].map((l) => (
            <button key={l} onClick={() => { setLang(l); savePref({ language: l }); }} data-testid={`settings-lang-${l}`}
              className={`px-4 py-2 rounded-md text-sm border transition-colors duration-200 ${lang === l ? k.primary : k.ghost}`}>
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      </div>

      <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          {k.dark ? <Moon className={`w-4 h-4 ${k.muted}`} /> : <Sun className={`w-4 h-4 ${k.muted}`} />}
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.settings.theme}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setTheme("dark"); savePref({ theme: "dark" }); }} data-testid="settings-theme-dark"
            className={`px-4 py-2 rounded-md text-sm border transition-colors duration-200 inline-flex items-center gap-2 ${currentTheme === "dark" ? k.primary : k.ghost}`}>
            <Moon className="w-4 h-4" /> {t.settings.dark}
          </button>
          <button onClick={() => { setTheme("light"); savePref({ theme: "light" }); }} data-testid="settings-theme-light"
            className={`px-4 py-2 rounded-md text-sm border transition-colors duration-200 inline-flex items-center gap-2 ${currentTheme === "light" ? k.primary : k.ghost}`}>
            <Sun className="w-4 h-4" /> {t.settings.light}
          </button>
        </div>
      </div>

      {canManageRoles && (
        <div className={`border rounded-xl ${k.cardBg} ${k.cardBorder} p-6`}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className={`w-4 h-4 ${k.muted}`} />
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${k.muted}`}>{t.settings.roles_perms}</p>
          </div>
          <p className={`text-xs ${k.muted} mb-4`}>{t.settings.roles_perms_hint}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {roles.filter((r) => r.name !== "Pending").map((r) => (
              <button key={r.name} onClick={() => selectRole(r.name)} data-testid={`role-tab-${r.name}`}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors duration-200 ${selectedRole === r.name ? k.primary : k.ghost}`}>
                {r.name}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {Object.entries(catalog).map(([key, label]) => {
              const checked = editing.includes(key);
              return (
                <label key={key} data-testid={`role-perm-${key}`}
                  className={`flex items-start gap-2.5 p-2.5 border ${k.cardBorder} rounded-md cursor-pointer ${k.hover}`}>
                  <input type="checkbox" checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked ? [...editing, key] : editing.filter((p) => p !== key);
                      setEditing(next);
                    }} className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm">{key}</p>
                    <p className={`text-xs ${k.muted}`}>{label}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className={`text-xs ${k.muted}`}>{t.settings.perms_selected}: <span className={k.subtle}>{editing.length}</span></p>
            <button onClick={saveRole} disabled={saving || !selectedRole} data-testid="role-save-btn"
              className={`${k.primary} rounded-md px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50 transition-colors duration-200`}>
              <Save className="w-4 h-4" /> {saving ? t.common.loading : t.settings.save_role}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
