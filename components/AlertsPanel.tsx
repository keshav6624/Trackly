import { DashboardAlerts } from "@/lib/types";

export function AlertsPanel({ alerts }: { alerts: DashboardAlerts }) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <article className="panel p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--inactive)" }}>
          Inactive Students
        </h3>
        <p className="mt-3 text-3xl font-bold" style={{ color: "var(--inactive)" }}>
          {alerts.inactiveCount}
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>students with no recent activity</p>
      </article>

      <article className="panel p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--risk)" }}>
          Below Threshold
        </h3>
        <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
          {alerts.belowThreshold.length === 0 ? (
            <li style={{ color: "var(--ink-muted)" }}>No students below threshold</li>
          ) : (
            alerts.belowThreshold.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className="font-semibold" style={{ color: "var(--risk)" }}>{s.placementScore}</span>
              </li>
            ))
          )}
        </ul>
      </article>

      <article className="panel p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ready)" }}>
          Top Performers
        </h3>
        <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
          {alerts.topPerformers.length === 0 ? (
            <li style={{ color: "var(--ink-muted)" }}>No data yet</li>
          ) : (
            alerts.topPerformers.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className="font-semibold" style={{ color: "var(--ready)" }}>{s.placementScore}</span>
              </li>
            ))
          )}
        </ul>
      </article>
    </section>
  );
}
