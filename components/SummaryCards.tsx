import { DashboardSummary } from "@/lib/types";

type SummaryCardsProps = { summary: DashboardSummary };

const cardConfig: Array<{
  key: keyof DashboardSummary;
  label: string;
  suffix?: string;
  color: string;
}> = [
  { key: "readyPct",    label: "Ready",     suffix: "%", color: "var(--ready)" },
  { key: "atRiskPct",   label: "At Risk",   suffix: "%", color: "var(--risk)" },
  { key: "inactivePct", label: "Inactive",  suffix: "%", color: "var(--inactive)" },
  { key: "avgScore",    label: "Avg Score", color: "var(--ink)" },
];

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cardConfig.map((card, i) => (
        <article
          key={card.key}
          className="panel animate-rise-in p-5"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <p style={{ color: "var(--ink-muted)" }} className="text-xs font-medium uppercase tracking-wider">
            {card.label}
          </p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight" style={{ color: card.color }}>
            {summary[card.key]}{card.suffix}
          </p>
        </article>
      ))}
    </section>
  );
}
