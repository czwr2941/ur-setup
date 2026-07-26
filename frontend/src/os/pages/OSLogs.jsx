import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { osApi } from "../api";
import { formatRelative } from "../i18n";

export default function OSLogs() {
  const { t, lang, theme } = useOutletContext();
  const isDark = theme === "dark";
  const [rows, setRows] = useState([]);

  useEffect(() => {
    osApi.get("/activity-logs").then((r) => setRows(r.data)).catch(() => setRows([]));
  }, []);

  const cardCls = isDark ? "bg-[#111827] border-white/8" : "bg-white border-slate-200 shadow-sm";

  return (
    <div data-testid="os-logs" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.logs.title}</h1>
        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.logs.subtitle}</p>
      </div>

      <div className={`border rounded-xl overflow-x-auto ${cardCls}`}>
        {rows.length === 0 ? (
          <p className={`p-8 text-center text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>{t.logs.empty}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className={isDark ? "bg-white/5" : "bg-slate-50"}>
              <tr className={`text-[10px] font-mono tracking-[0.2em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                <th className="text-start px-4 py-3">{t.logs.when}</th>
                <th className="text-start px-4 py-3">{t.logs.who}</th>
                <th className="text-start px-4 py-3">{t.logs.what}</th>
                <th className="text-start px-4 py-3">{t.logs.module}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={`border-t ${isDark ? "border-white/6" : "border-slate-100"}`} data-testid={`log-${a.id}`}>
                  <td className={`px-4 py-3 text-xs font-mono ${isDark ? "text-slate-500" : "text-slate-500"} whitespace-nowrap`}>
                    {formatRelative(a.created_at, lang)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"} flex items-center justify-center text-xs font-semibold`}>
                        {(a.user_name || "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm">{a.user_name}</p>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{a.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-1 rounded-md ${isDark ? "bg-white/5" : "bg-slate-100"}`}>{a.action.replace(/_/g, " ")}</span>
                    {a.target && <span className={`ms-2 text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-500"}`}>{String(a.target).slice(0, 12)}</span>}
                  </td>
                  <td className={`px-4 py-3 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{a.module}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
