"use client";

import { useState } from "react";
import { StudentAnalytics } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

type ReportsPanelProps = { students: StudentAnalytics[] };

type ReportInsights = {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

const buildInsights = (student: StudentAnalytics): ReportInsights => {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  const total     = student.leetcode.totalSolved;
  const hardShare = pct(student.leetcode.hard, total);
  const medShare  = pct(student.leetcode.medium, total);
  const consistency = student.leetcode.consistencyScore;
  const commits   = student.github.commitsLast7Days;

  if (medShare >= 40)               strengths.push(`Strong interview-ready medium coverage at ${medShare}% of solved set.`);
  if (hardShare >= 12)              strengths.push(`Good hard-problem depth — ${student.leetcode.hard} hard problems solved.`);
  if (commits >= 5)                 strengths.push(`Active GitHub presence — ${commits} commits in the last 7 days.`);
  if (student.placementScore >= 70) strengths.push(`Placement score of ${student.placementScore} indicates high readiness.`);
  if (student.github.repos >= 5)    strengths.push(`Solid portfolio with ${student.github.repos} public repositories.`);

  if (student.leetcode.hard < 20 && total > 80) {
    weaknesses.push(`Only ${student.leetcode.hard} hard problems relative to ${total} total.`);
    recommendations.push("Target 2–3 hard problems weekly, focusing on graph/DP patterns.");
  }
  if (consistency < 30) {
    weaknesses.push(`Consistency score is ${consistency}% — practice cadence is uneven.`);
    recommendations.push("Commit to 45 min/day, 5 days a week. Review one past mistake each session.");
  }
  if (commits < 3) {
    weaknesses.push(`Low GitHub activity — only ${commits} commits in 7 days.`);
    recommendations.push("Push at least one meaningful commit every 2 days to demonstrate active development.");
  }
  if (student.github.repos < 3) {
    weaknesses.push(`Portfolio has only ${student.github.repos} public repos — limited breadth.`);
    recommendations.push("Build 2 showcase projects with clear README, screenshots, and live demos.");
  }

  if (!strengths.length) strengths.push("Balanced baseline with clear room to optimize for interviews.");
  if (!weaknesses.length) weaknesses.push("No major weak signals detected from current data.");
  if (!recommendations.length) recommendations.push("Maintain momentum: weekly mix of medium/hard + one timed mock.");

  return { strengths, weaknesses, recommendations };
};

export function ReportsPanel({ students }: ReportsPanelProps) {
  const [inputName, setInputName]       = useState("");
  const [inputRoll, setInputRoll]       = useState("");
  const [selectedId, setSelectedId]     = useState("");
  const [inputMode, setInputMode]       = useState<"manual" | "pick">("pick");
  const [error, setError]               = useState<string | null>(null);
  const [result, setResult]             = useState<StudentAnalytics | null>(null);

  const handleGenerate = () => {
    setError(null);
    let matched: StudentAnalytics | undefined;

    if (inputMode === "pick") {
      matched = students.find((s) => s.id === selectedId);
    } else {
      const normName = inputName.trim().toLowerCase();
      const normRoll = inputRoll.trim().toLowerCase();
      if (!normName && !normRoll) {
        setError("Enter a student name, roll no, or both to search.");
        return;
      }
      matched = students.find((s) => {
        const nameOk = normName ? s.name.toLowerCase().includes(normName) : true;
        const rollOk = normRoll ? s.id.toLowerCase() === normRoll : true;
        return nameOk && rollOk;
      });
    }

    if (!matched) {
      setResult(null);
      setError("Student not found. Check the name / roll no or pick from the saved list.");
      return;
    }

    setResult(matched);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setInputName("");
    setInputRoll("");
    setSelectedId("");
  };

  const insights = result ? buildInsights(result) : null;

  return (
    <section className="space-y-5">
      {/* Search card */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>Reports</h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }}>
              Generate a full LeetCode + GitHub report for a student.
            </p>
          </div>
          {result && (
            <button type="button" onClick={handleReset} className="btn-ghost text-xs px-3 py-1.5">
              ← New Report
            </button>
          )}
        </div>

        {!result && (
          <>
            {/* Mode switcher */}
            <div className="flex gap-2 mb-4">
              {(["pick", "manual"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInputMode(m)}
                  style={{
                    background: inputMode === m ? "var(--ink)" : "var(--bg-secondary)",
                    color: inputMode === m ? "var(--panel)" : "var(--ink-secondary)",
                    border: "1px solid var(--line)",
                  }}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium transition"
                >
                  {m === "pick" ? "Pick from list" : "Enter manually"}
                </button>
              ))}
            </div>

            {inputMode === "pick" ? (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--ink-muted)" }}>
                    Saved Students
                  </label>
                  {students.length === 0 ? (
                    <p className="field text-center" style={{ color: "var(--ink-muted)", cursor: "default" }}>
                      No students added yet — go to Students to add one.
                    </p>
                  ) : (
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="field"
                    >
                      <option value="">Select a student…</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!selectedId}
                  className="btn-primary"
                >
                  Generate Report
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--ink-muted)" }}>Student Name</label>
                    <input
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      placeholder="e.g. Rohan Iyer"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--ink-muted)" }}>Roll No</label>
                    <input
                      value={inputRoll}
                      onChange={(e) => setInputRoll(e.target.value)}
                      placeholder="e.g. S-003"
                      className="field"
                    />
                  </div>
                </div>
                <button type="button" onClick={handleGenerate} className="btn-primary">
                  Generate Report
                </button>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--badge-inactive-bg)", color: "var(--inactive)", border: "1px solid var(--inactive)" }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Report output */}
      {result && insights && (
        <div className="space-y-4 animate-rise-in">
          {/* Identity */}
          <div className="panel p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{result.name}</h3>
                <p className="text-sm mt-0.5" style={{ color: "var(--ink-muted)" }}>Roll No: {result.id}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Placement Score</p>
                  <p className="text-3xl font-extrabold" style={{ color: "var(--ink)" }}>{result.placementScore}</p>
                </div>
                <StatusBadge status={result.finalStatus} />
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LeetCode */}
            <div className="panel p-5">
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--ink-muted)" }}>LeetCode</h4>
              <div className="space-y-2">
                {[
                  { label: "Total Solved", value: result.leetcode.totalSolved },
                  { label: "Easy", value: `${result.leetcode.easy} (${pct(result.leetcode.easy, result.leetcode.totalSolved)}%)` },
                  { label: "Medium", value: `${result.leetcode.medium} (${pct(result.leetcode.medium, result.leetcode.totalSolved)}%)` },
                  { label: "Hard", value: `${result.leetcode.hard} (${pct(result.leetcode.hard, result.leetcode.totalSolved)}%)` },
                  { label: "Consistency", value: `${result.leetcode.consistencyScore}%` },
                  { label: "Last Active", value: result.leetcode.lastActivityAt ? new Date(result.leetcode.lastActivityAt).toLocaleDateString() : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span style={{ color: "var(--ink-muted)" }}>{label}</span>
                    <span className="font-semibold" style={{ color: "var(--ink)" }}>{value}</span>
                  </div>
                ))}
              </div>

              {result.leetcode.recentSubmissions.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ink-muted)" }}>Recent Submissions</p>
                  <ul className="space-y-1">
                    {result.leetcode.recentSubmissions.slice(0, 5).map((sub) => (
                      <li key={sub.id} className="flex justify-between text-xs rounded-lg px-3 py-1.5" style={{ background: "var(--bg-secondary)" }}>
                        <span style={{ color: "var(--ink)" }}>{sub.title}</span>
                        <span style={{ color: "var(--ink-muted)" }}>{sub.statusDisplay}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* GitHub */}
            <div className="panel p-5">
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--ink-muted)" }}>GitHub</h4>
              <div className="space-y-2">
                {[
                  { label: "Public Repos", value: result.github.repos },
                  { label: "Commits (7 days)", value: result.github.commitsLast7Days },
                  { label: "Activity Level", value: result.github.activityLevel },
                  { label: "Last Active", value: result.github.lastActivityAt ? new Date(result.github.lastActivityAt).toLocaleDateString() : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span style={{ color: "var(--ink-muted)" }}>{label}</span>
                    <span className="font-semibold" style={{ color: "var(--ink)" }}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ink-muted)" }}>Overall Activity</p>
                <StatusBadge status={result.activityStatus} />
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel p-5">
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--ready)" }}>Strengths</h4>
              <ul className="space-y-2">
                {insights.strengths.map((item) => (
                  <li key={item} className="flex gap-2 text-sm" style={{ color: "var(--ink-secondary)" }}>
                    <span style={{ color: "var(--ready)" }} className="flex-shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel p-5">
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--risk)" }}>Weaknesses</h4>
              <ul className="space-y-2">
                {insights.weaknesses.map((item) => (
                  <li key={item} className="flex gap-2 text-sm" style={{ color: "var(--ink-secondary)" }}>
                    <span style={{ color: "var(--risk)" }} className="flex-shrink-0 mt-0.5">!</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="panel p-5">
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Recommendations</h4>
            <ul className="space-y-2">
              {insights.recommendations.map((item, i) => (
                <li key={item} className="flex gap-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--bg-secondary)", color: "var(--ink-muted)" }}>{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="panel p-5">
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--risk)" }}>Data Warnings</h4>
              <ul className="space-y-1 text-sm list-disc pl-5" style={{ color: "var(--ink-secondary)" }}>
                {result.errors.map((e, idx) => <li key={`${e}-${idx}`}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
