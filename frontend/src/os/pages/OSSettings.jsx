import React from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Sun, Moon, Globe, User } from "lucide-react";
import { useLang } from "../../contexts/LangContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { osApi } from "../api";

export default function OSSettings() {
  const { t, theme } = useOutletContext();
  const isDark = theme === "dark";
  const { lang, set: setLang } = useLang();
  const { theme: currentTheme, setTheme } = useTheme();
  const { user, setUser } = useAuth();

  const savePref = async (patch) => {
    try {
      const { data } = await osApi.patch("/preferences", patch);
      setUser({ ...user, ...data });
      toast.success(t.common.updated);
    } catch { toast.error(t.common.failed); }
  };

  const cardCls = isDark ? "bg-[#111827] border-white/8" : "bg-white border-slate-200 shadow-sm";

  return (
    <div data-testid="os-settings" className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.settings.title}</h1>
      </div>

      <div className={`border rounded-xl ${cardCls} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <User className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.settings.profile}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{t.employees.name}</p><p>{user?.name}</p></div>
          <div><p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{t.employees.email}</p><p>{user?.email}</p></div>
          <div><p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{t.employees.role}</p><p>{user?.role}</p></div>
        </div>
      </div>

      <div className={`border rounded-xl ${cardCls} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.settings.language}</p>
        </div>
        <div className="flex gap-2">
          {["ar", "en"].map((l) => (
            <button key={l} onClick={() => { setLang(l); savePref({ language: l }); }}
              data-testid={`settings-lang-${l}`}
              className={`px-4 py-2 rounded-md text-sm border transition-colors duration-200 ${lang === l ? "bg-blue-600 text-white border-blue-600" : isDark ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50"}`}>
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      </div>

      <div className={`border rounded-xl ${cardCls} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          {isDark ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-slate-500" />}
          <p className={`text-[10px] font-mono tracking-[0.24em] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.settings.theme}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setTheme("dark"); savePref({ theme: "dark" }); }} data-testid="settings-theme-dark"
            className={`px-4 py-2 rounded-md text-sm border transition-colors duration-200 inline-flex items-center gap-2 ${currentTheme === "dark" ? "bg-blue-600 text-white border-blue-600" : isDark ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50"}`}>
            <Moon className="w-4 h-4" /> {t.settings.dark}
          </button>
          <button onClick={() => { setTheme("light"); savePref({ theme: "light" }); }} data-testid="settings-theme-light"
            className={`px-4 py-2 rounded-md text-sm border transition-colors duration-200 inline-flex items-center gap-2 ${currentTheme === "light" ? "bg-blue-600 text-white border-blue-600" : isDark ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50"}`}>
            <Sun className="w-4 h-4" /> {t.settings.light}
          </button>
        </div>
      </div>
    </div>
  );
}
