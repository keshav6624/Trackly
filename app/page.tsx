"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertsPanel } from "@/components/AlertsPanel";
import { ReportsPanel } from "@/components/ReportsPanel";
import { Sidebar } from "@/components/Sidebar";
import { StudentDetailDrawer } from "@/components/StudentDetailDrawer";
import { StudentTable } from "@/components/StudentTable";
import { SummaryCards } from "@/components/SummaryCards";
import { StudentAnalytics, StudentsApiResponse } from "@/lib/types";

type NavSection = "Dashboard" | "Students" | "Reports" | "Alerts" | "Settings";

type NewStudentForm = {
  id: string;
  name: string;
  leetcodeUsername: string;
  githubUsername: string;
};

type StudentFormMode = "add" | "edit";

const emptyResponse: StudentsApiResponse = {
  generatedAt: new Date(0).toISOString(),
  cached: false,
  cacheExpiresAt: new Date(0).toISOString(),
  summary: { readyPct: 0, atRiskPct: 0, inactivePct: 0, avgScore: 0 },
  alerts: { inactiveCount: 0, belowThreshold: [], topPerformers: [] },
  students: [],
};

export default function DashboardPage() {
  const [collapsed, setCollapsed]             = useState(false);
  const [activeSection, setActiveSection]     = useState<NavSection>("Dashboard");
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [statusFilter, setStatusFilter]       = useState<"All" | "Ready" | "At Risk" | "Inactive">("All");
  const [query, setQuery]                     = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentAnalytics | null>(null);
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [addOpen, setAddOpen]                 = useState(false);
  const [addLoading, setAddLoading]           = useState(false);
  const [addError, setAddError]               = useState<string | null>(null);
  const [studentFormMode, setStudentFormMode]  = useState<StudentFormMode>("add");
  const [form, setForm]                       = useState<NewStudentForm>({ id: "", name: "", leetcodeUsername: "", githubUsername: "" });
  const [data, setData]                       = useState<StudentsApiResponse>(emptyResponse);
  const [darkMode, setDarkMode]               = useState(false);

  // Dark mode — toggle html class
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [darkMode]);

  // Persist dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem("trackly-dark");
    if (saved !== "1") return;

    const frame = window.requestAnimationFrame(() => setDarkMode(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const toggleDark = () => {
    setDarkMode((d) => {
      localStorage.setItem("trackly-dark", d ? "0" : "1");
      return !d;
    });
  };

  // Hash-based navigation
  useEffect(() => {
    const hashToSection = (h: string): NavSection => {
      const v = h.replace("#", "").trim().toLowerCase();
      if (v === "students") return "Students";
      if (v === "reports")  return "Reports";
      if (v === "alerts")   return "Alerts";
      if (v === "settings") return "Settings";
      return "Dashboard";
    };
    const apply = () => setActiveSection(hashToSection(window.location.hash));
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const fetchDashboard = async (signal?: AbortSignal): Promise<StudentsApiResponse | null> => {
    setError(null);
    try {
      const res = await fetch("/api/students", { signal });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const payload = (await res.json()) as StudentsApiResponse;
      setData(payload);
      return payload;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    const ctrl = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetchDashboard(ctrl.signal);
    }, 0);

    return () => {
      ctrl.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  const filteredStudents = useMemo(() => {
    return data.students.filter((s) => {
      const matchStatus = statusFilter === "All" || s.finalStatus === statusFilter;
      const q = query.trim().toLowerCase();
      const matchQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.leetcodeUsername.toLowerCase().includes(q) ||
        s.githubUsername.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [data.students, query, statusFilter]);

  const openStudent = (student: StudentAnalytics) => {
    setSelectedStudent(student);
    setDrawerOpen(true);
  };

  const openAddStudent = () => {
    setStudentFormMode("add");
    setForm({ id: "", name: "", leetcodeUsername: "", githubUsername: "" });
    setAddError(null);
    setAddOpen(true);
  };

  const openEditStudent = (student: StudentAnalytics) => {
    setStudentFormMode("edit");
    setForm({
      id: student.id,
      name: student.name,
      leetcodeUsername: student.leetcodeUsername,
      githubUsername: student.githubUsername,
    });
    setAddError(null);
    setAddOpen(true);
    setDrawerOpen(true);
    setSelectedStudent(student);
  };

  const updateField = (field: keyof NewStudentForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitStudentForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      const isEditMode = studentFormMode === "edit";
      const res = await fetch(
        isEditMode ? `/api/students/${encodeURIComponent(form.id)}` : "/api/students",
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEditMode
              ? {
                  name: form.name,
                  leetcodeUsername: form.leetcodeUsername,
                  githubUsername: form.githubUsername,
                }
              : form,
          ),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.message === "string"
            ? body.message
            : `Failed to ${isEditMode ? "update" : "add"} student (${res.status})`
        );
      }
      setAddOpen(false);
      setForm({ id: "", name: "", leetcodeUsername: "", githubUsername: "" });
      const refreshed = await fetchDashboard();
      if (isEditMode && refreshed) {
        const updatedStudent = refreshed.students.find((student) => student.id === form.id) ?? null;
        setSelectedStudent(updatedStudent);
        setDrawerOpen(Boolean(updatedStudent));
      }
      setActiveSection("Students");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Unable to add student");
    } finally {
      setAddLoading(false);
    }
  };

  const deleteStudent = async (student: StudentAnalytics) => {
    const confirmed = window.confirm(`Delete student ${student.name} (${student.id})?`);
    if (!confirmed) return;

    setError(null);
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(student.id)}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.message === "string"
            ? body.message
            : `Failed to delete student (${res.status})`
        );
      }

      const refreshed = await fetchDashboard();
      setSelectedStudent(null);
      setDrawerOpen(false);
      if (refreshed) {
        setData(refreshed);
      }
      setActiveSection("Students");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete student");
    }
  };

  const sidebarWidth = collapsed ? "68px" : "224px";

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        activeItem={activeSection}
        onSelect={(item) => setActiveSection(item as NavSection)}
        darkMode={darkMode}
        onToggleDark={toggleDark}
      />

      <div style={{ marginLeft: sidebarWidth, transition: "margin-left 0.3s ease" }}>
        <div className="mx-auto max-w-[1400px] p-5 md:p-8 space-y-5">

          {/* Header */}
          <header className="panel animate-rise-in flex items-center justify-between p-5">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
                TRACKLY
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }}>
                Unified coding readiness — LeetCode + GitHub.
              </p>
            </div>
            <div className="text-right text-xs" style={{ color: "var(--ink-muted)" }}>
              {loading ? (
                <span>Refreshing…</span>
              ) : (
                <>
                  <p>Last updated</p>
                  <p className="font-medium" style={{ color: "var(--ink-secondary)" }}>
                    {new Date(data.generatedAt).toLocaleString()}
                  </p>
                </>
              )}
            </div>
          </header>

          {/* Error banner */}
          {error && !loading && (
            <div
              className="rounded-[14px] px-4 py-3 text-sm"
              style={{ background: "var(--badge-inactive-bg)", color: "var(--inactive)", border: "1px solid var(--inactive)" }}
            >
              Failed to load: {error}. Showing cached data.
            </div>
          )}

          {/* Loading skeleton */}
          {loading ? (
            <div className="panel p-6 text-sm flex items-center gap-3" style={{ color: "var(--ink-muted)" }}>
              <span
                className="inline-block h-4 w-4 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--line)", borderTopColor: "var(--ink)" }}
              />
              Loading dashboard data…
            </div>
          ) : (
            <>
              {/* Dashboard */}
              {activeSection === "Dashboard" && (
                <>
                  <SummaryCards summary={data.summary} />
                  <AlertsPanel alerts={data.alerts} />
                </>
              )}

              {/* Students */}
              {activeSection === "Students" && (
                <>
                  <div className="panel p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-1 gap-2">
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search by name, ID, LeetCode or GitHub…"
                          className="field"
                        />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                          className="field"
                          style={{ width: "auto", flexShrink: 0 }}
                        >
                          <option value="All">All</option>
                          <option value="Ready">Ready</option>
                          <option value="At Risk">At Risk</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={openAddStudent}
                        className="btn-primary flex-shrink-0"
                      >
                        + Add Student
                      </button>
                    </div>
                  </div>
                  <StudentTable students={filteredStudents} onView={openStudent} />
                </>
              )}

              {/* Reports */}
              {activeSection === "Reports" && (
                <ReportsPanel students={data.students} />
              )}

              {/* Alerts */}
              {activeSection === "Alerts" && (
                <AlertsPanel alerts={data.alerts} />
              )}

              {/* Settings */}
              {activeSection === "Settings" && (
                <div className="panel p-6">
                  <h2 className="text-lg font-bold mb-3" style={{ color: "var(--ink)" }}>Settings</h2>
                  <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Dark Mode</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>Toggle between light and dark theme</p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleDark}
                      style={{
                        background: darkMode ? "var(--ink)" : "var(--line)",
                        width: 44,
                        height: 24,
                        borderRadius: 999,
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        transition: "background 0.2s",
                        flexShrink: 0,
                      }}
                      aria-label="Toggle dark mode"
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 3,
                          left: darkMode ? 23 : 3,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "var(--panel)",
                          transition: "left 0.2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }}
                      />
                    </button>
                  </div>
                  <p className="mt-4 text-xs" style={{ color: "var(--ink-muted)" }}>
                    More preferences coming soon.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}
        >
          <form
            onSubmit={submitStudentForm}
            className="w-full max-w-md panel p-6 space-y-4"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                  {studentFormMode === "edit" ? "Edit Student" : "Add Student"}
                </h2>
              <p className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }}>
                  {studentFormMode === "edit"
                    ? "Update the student's details. Roll No cannot be changed."
                    : "Enter the student's details to begin tracking."}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--ink-muted)" }}>Roll No *</label>
                <input
                  required
                  value={form.id}
                  disabled={studentFormMode === "edit"}
                  onChange={(e) => updateField("id", e.target.value)}
                  placeholder="e.g. S-009"
                  className="field"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--ink-muted)" }}>Student Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Full name"
                  className="field"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--ink-muted)" }}>LeetCode Username *</label>
                <input
                  required
                  value={form.leetcodeUsername}
                  onChange={(e) => updateField("leetcodeUsername", e.target.value)}
                  placeholder="LeetCode handle"
                  className="field"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--ink-muted)" }}>GitHub Username *</label>
                <input
                  required
                  value={form.githubUsername}
                  onChange={(e) => updateField("githubUsername", e.target.value)}
                  placeholder="GitHub handle"
                  className="field"
                />
              </div>
            </div>

            {addError && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "var(--badge-inactive-bg)", color: "var(--inactive)", border: "1px solid var(--inactive)" }}
              >
                {addError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="btn-ghost"
                disabled={addLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={addLoading}
              >
                {addLoading ? (studentFormMode === "edit" ? "Updating…" : "Adding…") : (studentFormMode === "edit" ? "Update Student" : "Save Student")}
              </button>
            </div>
          </form>
        </div>
      )}

      <StudentDetailDrawer
        student={selectedStudent}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={openEditStudent}
        onDelete={deleteStudent}
      />
    </main>
  );
}
