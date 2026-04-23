"use client";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  activeItem: string;
  onSelect: (item: string) => void;
  darkMode: boolean;
  onToggleDark: () => void;
};

const navItems = [
  { id: "Dashboard", icon: "⊡" },
  { id: "Students",  icon: "◫" },
  { id: "Reports",   icon: "◨" },
  { id: "Alerts",    icon: "◈" },
  { id: "Settings",  icon: "◎" },
];

export function Sidebar({ collapsed, onToggle, activeItem, onSelect, darkMode, onToggleDark }: SidebarProps) {
  return (
    <aside
      style={{
        background: "var(--panel)",
        borderRight: "1px solid var(--line)",
        boxShadow: "var(--shadow)",
      }}
      className={`fixed left-0 top-0 z-40 h-screen transition-all duration-300 flex flex-col ${collapsed ? "w-[68px]" : "w-56"}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <button
          type="button"
          onClick={onToggle}
          style={{ color: "var(--ink)", background: "var(--bg-secondary)", border: "1px solid var(--line)" }}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-base font-bold transition hover:opacity-70 flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          ≡
        </button>
        {!collapsed && (
          <span style={{ color: "var(--ink)" }} className="font-bold text-sm tracking-widest uppercase select-none">
            Trackly
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map(({ id, icon }) => {
          const active = activeItem === id;
          return (
            <button
              type="button"
              key={id}
              onClick={() => {
                onSelect(id);
                if (typeof window !== "undefined") window.location.hash = id.toLowerCase();
              }}
              style={{
                background: active ? "var(--bg-secondary)" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-muted)",
                border: active ? "1px solid var(--line)" : "1px solid transparent",
                fontWeight: active ? 600 : 400,
              }}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${collapsed ? "justify-center" : ""}`}
            >
              <span className="text-base flex-shrink-0">{icon}</span>
              {!collapsed && <span>{id}</span>}
            </button>
          );
        })}
      </nav>

      {/* Dark mode toggle */}
      <div className="p-3">
        <button
          type="button"
          onClick={onToggleDark}
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--line)",
            color: "var(--ink-secondary)",
          }}
          className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition hover:opacity-80 ${collapsed ? "justify-center" : ""}`}
          aria-label="Toggle dark mode"
        >
          <span className="text-sm">{darkMode ? "☀" : "☾"}</span>
          {!collapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
        </button>
      </div>
    </aside>
  );
}
