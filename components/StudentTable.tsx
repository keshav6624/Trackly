import { StudentAnalytics } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

type StudentTableProps = {
  students: StudentAnalytics[];
  onView: (student: StudentAnalytics) => void;
};

export function StudentTable({ students, onView }: StudentTableProps) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--panel-border)", boxShadow: "var(--shadow)" }} className="overflow-x-auto rounded-[14px]">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-secondary)" }}>
            {["Name / ID", "LeetCode", "GitHub", "Activity", "Score", "Status", ""].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--ink-muted)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr
              key={student.id}
              style={{ borderTop: "1px solid var(--line)" }}
              className="transition"
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td className="px-4 py-3">
                <p className="font-semibold" style={{ color: "var(--ink)" }}>{student.name}</p>
                <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{student.id}</p>
              </td>
              <td className="px-4 py-3" style={{ color: "var(--ink)" }}>
                <span className="font-semibold">{student.leetcode.totalSolved}</span>
                <span className="ml-1 text-xs" style={{ color: "var(--ink-muted)" }}>solved</span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={student.github.activityLevel} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={student.activityStatus} />
              </td>
              <td className="px-4 py-3 font-bold" style={{ color: "var(--ink)" }}>
                {student.placementScore}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={student.finalStatus} />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onView(student)}
                  className="btn-ghost text-xs px-3 py-1.5"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td
                className="px-4 py-10 text-center text-sm"
                style={{ color: "var(--ink-muted)" }}
                colSpan={7}
              >
                No students match the current filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
