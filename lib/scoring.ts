import {
  ActivityStatus,
  DashboardAlerts,
  DashboardSummary,
  FinalStatus,
  GithubActivityLevel,
  StudentAnalytics,
} from "@/lib/types";

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

export const normalize = (value: number, maxReference: number) => {
  if (maxReference <= 0) return 0;
  return clamp((value / maxReference) * 100, 0, 100);
};

export const getGithubActivityLevel = (commitsLast7Days: number): GithubActivityLevel => {
  if (commitsLast7Days > 20) return "High";
  if (commitsLast7Days >= 5) return "Medium";
  return "Low";
};

export const getActivityStatus = (lastActivityAt: Date | null): ActivityStatus => {
  if (!lastActivityAt) return "Inactive";

  const now = Date.now();
  const days = (now - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);

  if (days <= 3) return "Active";
  if (days <= 7) return "At Risk";
  return "Inactive";
};

export const calculatePlacementScore = (input: {
  totalSolved: number;
  consistencyScore: number;
  commitsLast7Days: number;
  repoCount: number;
}): number => {
  const solvedNormalized = normalize(input.totalSolved, 600);
  const consistencyNormalized = clamp(input.consistencyScore, 0, 100);
  const commitsNormalized = normalize(input.commitsLast7Days, 30);
  const reposNormalized = normalize(input.repoCount, 20);

  const weighted =
    solvedNormalized * 0.4 +
    consistencyNormalized * 0.2 +
    commitsNormalized * 0.25 +
    reposNormalized * 0.15;

  return Math.round(clamp(weighted, 0, 100));
};

export const getFinalStatus = (score: number): FinalStatus => {
  if (score > 75) return "Ready";
  if (score >= 50) return "At Risk";
  return "Inactive";
};

export const buildSummary = (students: StudentAnalytics[]): DashboardSummary => {
  const total = students.length || 1;
  const ready = students.filter((student) => student.finalStatus === "Ready").length;
  const atRisk = students.filter((student) => student.finalStatus === "At Risk").length;
  const inactive = students.filter((student) => student.finalStatus === "Inactive").length;

  const avgScore =
    students.length === 0
      ? 0
      : Math.round(
          students.reduce((sum, student) => sum + student.placementScore, 0) / students.length,
        );

  return {
    readyPct: Math.round((ready / total) * 100),
    atRiskPct: Math.round((atRisk / total) * 100),
    inactivePct: Math.round((inactive / total) * 100),
    avgScore,
  };
};

export const buildAlerts = (students: StudentAnalytics[]): DashboardAlerts => {
  const inactiveCount = students.filter((student) => student.activityStatus === "Inactive").length;

  const belowThreshold = students
    .filter((student) => student.placementScore < 50)
    .sort((a, b) => a.placementScore - b.placementScore)
    .slice(0, 5)
    .map((student) => ({
      id: student.id,
      name: student.name,
      placementScore: student.placementScore,
    }));

  const topPerformers = [...students]
    .sort((a, b) => b.placementScore - a.placementScore)
    .slice(0, 3)
    .map((student) => ({
      id: student.id,
      name: student.name,
      placementScore: student.placementScore,
    }));

  return {
    inactiveCount,
    belowThreshold,
    topPerformers,
  };
};
