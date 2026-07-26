import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Circle, ShieldAlert } from "lucide-react";
import { osApi } from "../api";
import { formatRelative } from "../i18n";

const OS_ROLES = ["CEO", "Marketing", "Operations", "Tech & Sales", "Support"];
const EMPTY = { name: "", email: "", password: "", role: "Support", language: "ar" };

export default function OSEmployees() {
  const { user: me, t, lang, theme } = useOutletContext();
  const isDark = theme === "dark";
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const canManage = (me.permissions_effective || me.permissions || []).includes("employees.manage");

  const load = useCallback(async () => {
    try {
      const r = await osApi.get("/employees");
      setRows(r.data);
    } catch { toast.error(t.common.failed); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await osApi.post("/employees", form);
      toast.success(t.common.created);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : t.common.failed);
    } finally { setBusy(false); }
  };

  const changeRole = async (uid, role) => {
    try { await osApi.patch(`/employees/${uid}`, { role }); toast.success(t.common.updated); load(); }
    catch { toast.error(t.common.failed); }
  };

  const del = async (uid) => {
    if (!window.confirm(t.employees.confirm_delete)) return;
    try { await osApi.delete(`/employees/${uid}`); toast.success(t.common.deleted); load(); }
    catch { toast.error(t.common.failed); }
  };

  const cardCls = isDark ? "bg-[#111827] border-white/8" : "bg-white border-slate-200 shadow-sm";
  const inputCls = `w-full px-3 py-2 rounded-md border text-sm ${isDark ? "bg-[#0B0F19] border-white/10 focus:border-blue-500" : "bg-white border-slate-200 focus:border-blue-600"} focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200`;

  return (
    <div data-testid="os-employees" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.employees.title}</h1>
        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.employees.subtitle}</p>
      </div>

      {canManage && (
        <form onSubmit={create} className={`border rounded-xl p-5 ${cardCls} grid md:grid-cols-5 gap-3`} data-testid="emp-add-form">
          <input required placeholder={t.employees.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            data-testid="emp-name" className={inputCls} />
          <input required type="email" placeholder={t.employees.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            data-testid="emp-email" className={inputCls} />
          <input required type="password" placeholder={t.employees.password + " (6+)"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            data-testid="emp-password" className={inputCls} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="emp-role" className={inputCls}>
            {OS_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" disabled={busy} data-testid="emp-add-btn"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md px-4 py-2 disabled:opacity-50 transition-colors duration-200 inline-flex items-center justify-center gap-2 active:scale-[0.98]">
            <Plus className="w-4 h-4" /> {busy ? t.common.loading : t.employees.add}
          </button>
        </form>
      )}

      <div className={`border rounded-xl overflow-x-auto ${cardCls}`}>
        <table className="w-full text-sm">
          <thead className={isDark ? "bg-white/5" : "bg-slate-50"}>
            <tr className={`text-[10px] font-mono tracking-[0.2em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <th className="text-start px-4 py-3">{t.employees.name}</th>
              <th className="text-start px-4 py-3">{t.employees.email}</th>
              <th className="text-start px-4 py-3">{t.employees.role}</th>
              <th className="text-start px-4 py-3">{t.employees.status}</th>
              <th className="text-start px-4 py-3">{t.employees.last_seen}</th>
              {canManage && <th className="text-start px-4 py-3">{t.employees.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const online = u.status === "online";
              return (
                <tr key={u.id} className={`border-t ${isDark ? "border-white/6" : "border-slate-100"}`} data-testid={`emp-row-${u.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"} flex items-center justify-center text-xs font-semibold`}>
                        {(u.name || u.email).slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p>{u.name}{u.id === me.id && <span className={`ms-2 text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{t.employees.you}</span>}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{u.email}</td>
                  <td className="px-4 py-3">
                    {canManage && u.id !== me.id ? (
                      <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                        className={`text-xs px-2 py-1.5 rounded-md border ${isDark ? "bg-[#0B0F19] border-white/10" : "bg-white border-slate-200"}`}>
                        {OS_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        {!OS_ROLES.includes(u.role) && <option value={u.role}>{u.role}</option>}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isDark ? "bg-white/10 border-white/15" : "bg-slate-100 border-slate-200"} border`}>
                        <ShieldAlert className="w-3 h-3" /> {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <Circle className={`w-2 h-2 ${online ? "fill-emerald-500 text-emerald-500" : "fill-slate-400 text-slate-400"}`} />
                      {online ? t.employees.online : t.employees.offline}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    {u.last_seen ? formatRelative(u.last_seen, lang) : t.employees.never}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      {u.id !== me.id && (
                        <button onClick={() => del(u.id)} data-testid={`emp-del-${u.id}`}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border ${isDark ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"} transition-colors duration-200`}>
                          <Trash2 className="w-3 h-3" /> {t.employees.delete}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
