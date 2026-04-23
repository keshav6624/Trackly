type BadgeStatus = "Ready" | "At Risk" | "Inactive" | "Active" | "High" | "Medium" | "Low";

export function StatusBadge({ status }: { status: BadgeStatus | string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Ready:    { bg: "var(--badge-ready-bg)",    color: "var(--ready)" },
    Active:   { bg: "var(--badge-ready-bg)",    color: "var(--ready)" },
    High:     { bg: "var(--badge-ready-bg)",    color: "var(--ready)" },
    "At Risk":{ bg: "var(--badge-risk-bg)",     color: "var(--risk)" },
    Medium:   { bg: "var(--badge-risk-bg)",     color: "var(--risk)" },
    Inactive: { bg: "var(--badge-inactive-bg)", color: "var(--inactive)" },
    Low:      { bg: "var(--badge-inactive-bg)", color: "var(--inactive)" },
  };
  const style = map[status] ?? { bg: "var(--bg-secondary)", color: "var(--ink-muted)" };
  return (
    <span
      style={{ background: style.bg, color: style.color }}
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
    >
      {status}
    </span>
  );
}
