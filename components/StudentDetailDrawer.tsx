import { StudentAnalytics } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

type Props = {
  student: StudentAnalytics | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (student: StudentAnalytics) => void;
  onDelete?: (student: StudentAnalytics) => void;
};

export function StudentDetailDrawer({ student, open, onClose, onEdit, onDelete }: Props) {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(0,0,0,0.35)" }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg transform transition-transform duration-300 flex flex-col ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "var(--panel)", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
              {student?.name ?? "Student Details"}
            </h2>
            {student && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>{student.id}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {student && onEdit && (
              <button type="button" onClick={() => onEdit(student)} className="btn-ghost text-sm px-3 py-1.5">
                Edit
              </button>
            )}
            {student && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(student)}
                className="text-sm px-3 py-1.5 rounded-[10px] border"
                style={{
                  background: "var(--badge-inactive-bg)",
                  color: "var(--inactive)",
                  borderColor: "var(--inactive)",
                }}
              >
                Delete
              </button>
            )}
            <button type="button" onClick={onClose} className="btn-ghost text-sm px-3 py-1.5">
              ✕ Close
            </button>
          </div>
        </div>

        {!student ? (
          <div className="p-5 text-sm" style={{ color: "var(--ink-muted)" }}>Select a student to view metrics.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Snapshot */}
            <section className="panel p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Placement Score</span>
                <StatusBadge status={student.finalStatus} />
              </div>
              <p className="mt-2 text-4xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
                {student.placementScore}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>Activity: {student.activityStatus}</p>
            </section>

            {/* LeetCode */}
            <section className="panel p-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--ink)" }}>LeetCode</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Total Solved", student.leetcode.totalSolved],
                  ["Easy", student.leetcode.easy],
                  ["Medium", student.leetcode.medium],
                  ["Hard", student.leetcode.hard],
                  ["Consistency", `${student.leetcode.consistencyScore}%`],
                  ["Last Active", student.leetcode.lastActivityAt ? new Date(student.leetcode.lastActivityAt).toLocaleDateString() : "N/A"],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <span style={{ color: "var(--ink-muted)" }} className="text-xs">{label}</span>
                    <p className="font-semibold" style={{ color: "var(--ink)" }}>{val}</p>
                  </div>
                ))}
              </div>

              {student.leetcode.recentSubmissions.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ink-muted)" }}>Recent Submissions</p>
                  <ul className="space-y-1.5">
                    {student.leetcode.recentSubmissions.slice(0, 6).map((sub) => (
                      <li key={sub.id} className="flex justify-between items-center text-sm rounded-lg px-3 py-2" style={{ background: "var(--bg-secondary)" }}>
                        <span style={{ color: "var(--ink)" }}>{sub.title}</span>
                        <span className="text-xs ml-2 flex-shrink-0" style={{ color: "var(--ink-muted)" }}>{sub.statusDisplay}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* GitHub */}
            <section className="panel p-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--ink)" }}>GitHub</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Commits (7d)", student.github.commitsLast7Days],
                  ["Public Repos", student.github.repos],
                  ["Activity Level", student.github.activityLevel],
                  ["Last Active", student.github.lastActivityAt ? new Date(student.github.lastActivityAt).toLocaleDateString() : "N/A"],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <span style={{ color: "var(--ink-muted)" }} className="text-xs">{label}</span>
                    <p className="font-semibold" style={{ color: "var(--ink)" }}>{val}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Errors */}
            {student.errors && student.errors.length > 0 && (
              <section className="panel p-4">
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--risk)" }}>Data Warnings</h3>
                <ul className="text-sm space-y-1 list-disc pl-4" style={{ color: "var(--ink-secondary)" }}>
                  {student.errors.map((err, idx) => <li key={`${err}-${idx}`}>{err}</li>)}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}
