import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ShoppingBag, DollarSign, UserPlus, Clock, Users, Activity,
  Plus, Check, ListTodo, ArrowUpRight, UserCog, ScrollText, Circle,
  Plug, ExternalLink,
} from "lucide-react";
import { osApi } from "../api";
import { greetKey, formatRelative } from "../i18n";

function Card({ children, className = "", isDark, testId }) {
  return (
    <div data-testid={testId}
      className={`border rounded-xl p-5 transition-all duration-200 ${isDark ? "bg-[#111827] border-white/8 hover:border-white/15" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"} ${className}`}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, Icon, sub, isDark, testId }) {
  return (
    <Card isDark={isDark} testId={testId}>
      <div className="flex items-start justify-between mb-3">
        <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
        <Icon className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
      </div>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      {sub && <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>{sub}</p>}
    </Card>
  );
}

export default function OSDashboard() {
  const { user, t, lang, theme } = useOutletContext();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [onlineList, setOnlineList] = useState([]);
  const [taskTitle, setTaskTitle] = useState("");
  const perms = user.permissions_effective || user.permissions || [];
  const canSeeOnline = perms.includes("logs.view");

  const load = useCallback(async () => {
    try {
      const [s, tk, a] = await Promise.all([
        osApi.get("/dashboard/summary"),
        osApi.get("/tasks"),
        osApi.get("/dashboard/recent-activity"),
      ]);
      setSummary(s.data); setTasks(tk.data); setActivity(a.data);
      if (canSeeOnline) {
        const o = await osApi.get("/dashboard/online-employees");
        setOnlineList(o.data);
      }
    } catch (e) { /* ignore */ }
  }, [canSeeOnline]);

  useEffect(() => { load(); }, [load]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await osApi.post("/tasks", { title: taskTitle.trim() });
      setTaskTitle("");
      toast.success(t.common.created);
      load();
    } catch { toast.error(t.common.failed); }
  };

  const toggleTask = async (task) => {
    try { await osApi.patch(`/tasks/${task.id}`, { done: !task.done }); load(); }
    catch { toast.error(t.common.failed); }
  };

  const greet = t.greeting[greetKey()];
  const firstName = (user.name || user.email || "").split(" ")[0];

  return (
    <div data-testid="os-dashboard" className="space-y-8">
      <div>
        <p className={`text-[10px] font-mono tracking-[0.24em] uppercase mb-2 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
          {new Date().toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{greet}, {firstName} 👋</h1>
        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.dashboard.today_summary}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label={t.dashboard.orders} value={summary?.orders_today ?? "—"} Icon={ShoppingBag} sub={t.dashboard.coming} isDark={isDark} testId="metric-orders" />
        <MetricCard label={t.dashboard.revenue} value={summary?.revenue_today ?? "—"} Icon={DollarSign} sub={t.dashboard.coming} isDark={isDark} testId="metric-revenue" />
        <MetricCard label={t.dashboard.new_customers} value={summary?.new_customers ?? "—"} Icon={UserPlus} sub={t.dashboard.coming} isDark={isDark} testId="metric-customers" />
        <MetricCard label={t.dashboard.pending} value={summary?.pending_orders ?? "—"} Icon={Clock} sub={t.dashboard.coming} isDark={isDark} testId="metric-pending" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick actions */}
        <Card isDark={isDark} className="lg:col-span-1">
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.dashboard.quick}</p>
          <div className="space-y-2">
            <button onClick={() => document.getElementById("os-task-input")?.focus()} data-testid="quick-add-task"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md border ${isDark ? "border-white/8 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50"} transition-colors duration-200 text-sm`}>
              <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> {t.dashboard.quick_add_task}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </button>
            {perms.includes("employees.manage") && (
              <button onClick={() => navigate("/os/employees")} data-testid="quick-add-employee"
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md border ${isDark ? "border-white/8 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50"} transition-colors duration-200 text-sm`}>
                <span className="inline-flex items-center gap-2"><UserCog className="w-4 h-4" /> {t.dashboard.quick_add_employee}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            )}
            {perms.includes("logs.view") && (
              <button onClick={() => navigate("/os/logs")} data-testid="quick-open-logs"
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md border ${isDark ? "border-white/8 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50"} transition-colors duration-200 text-sm`}>
                <span className="inline-flex items-center gap-2"><ScrollText className="w-4 h-4" /> {t.dashboard.quick_open_logs}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            )}
          </div>
          <div className={`mt-6 pt-4 border-t ${isDark ? "border-white/8" : "border-slate-200"} space-y-2`}>
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.dashboard.integrations}</p>
            {["salla", "whatsapp", "email"].map((k) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 capitalize">
                  <Plug className={`w-3.5 h-3.5 ${isDark ? "text-slate-500" : "text-slate-400"}`} />{k}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{t.dashboard.not_connected}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tasks */}
        <Card isDark={isDark} className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.dashboard.tasks}</p>
            <ListTodo className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
          </div>
          <form onSubmit={addTask} className="flex gap-2 mb-3">
            <input id="os-task-input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
              placeholder={t.dashboard.quick_add_task} data-testid="task-input"
              className={`flex-1 px-3 py-2 rounded-md border text-sm ${isDark ? "bg-[#0B0F19] border-white/10 focus:border-blue-500" : "bg-white border-slate-200 focus:border-blue-600"} focus:outline-none transition-colors duration-200`} />
            <button data-testid="task-add-btn" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 rounded-md transition-colors duration-200"><Plus className="w-4 h-4" /></button>
          </form>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {tasks.length === 0 && <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{t.dashboard.no_tasks}</p>}
            {tasks.map((task) => (
              <button key={task.id} onClick={() => toggleTask(task)} data-testid={`task-${task.id}`}
                className={`w-full text-start flex items-center gap-3 px-2 py-2 rounded-md transition-colors duration-200 ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
                <span className={`w-4 h-4 rounded border flex items-center justify-center ${task.done ? "bg-blue-600 border-blue-600" : isDark ? "border-white/25" : "border-slate-300"}`}>
                  {task.done && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className={`text-sm ${task.done ? "line-through opacity-60" : ""}`}>{task.title}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Activity / Online */}
        <Card isDark={isDark} className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {canSeeOnline ? t.dashboard.online : t.dashboard.recent}
            </p>
            {canSeeOnline ? <Users className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} /> : <Activity className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />}
          </div>
          {canSeeOnline ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {onlineList.length === 0 && <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>—</p>}
              {onlineList.map((u) => (
                <div key={u.id} className="flex items-center gap-2" data-testid={`online-${u.id}`}>
                  <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                  <span className="text-sm">{u.name}</span>
                  <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>· {u.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activity.length === 0 && <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{t.dashboard.no_activity}</p>}
              {activity.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{a.action.replace(/_/g, " ")}</p>
                    <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{a.module}</p>
                  </div>
                  <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-500"} shrink-0`}>{formatRelative(a.created_at, lang)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {canSeeOnline && (
        <Card isDark={isDark}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.dashboard.recent}</p>
            <a href="/os/logs" className={`text-xs inline-flex items-center gap-1 ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}>
              {t.nav.logs} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-2">
            {activity.slice(0, 6).map((a) => (
              <div key={a.id} className={`flex items-center justify-between gap-3 py-2 border-b last:border-0 ${isDark ? "border-white/6" : "border-slate-100"}`}>
                <div className="min-w-0 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full ${isDark ? "bg-white/5" : "bg-slate-100"} flex items-center justify-center text-xs font-semibold`}>
                    {(a.user_name || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{a.user_name}</span>{" "}
                      <span className={isDark ? "text-slate-400" : "text-slate-500"}>· {a.action.replace(/_/g, " ")}</span>
                    </p>
                    <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{a.module}{a.target ? ` · ${a.target.slice(0, 8)}` : ""}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-500"}`}>{formatRelative(a.created_at, lang)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
