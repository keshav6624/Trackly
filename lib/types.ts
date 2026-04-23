export type Student = {
  id: string;
  name: string;
  leetcodeUsername: string;
  githubUsername: string;
};

export type ActivityStatus = "Active" | "At Risk" | "Inactive";
export type GithubActivityLevel = "High" | "Medium" | "Low";
export type FinalStatus = "Ready" | "At Risk" | "Inactive";

export type RecentSubmission = {
  id: string;
  title: string;
  titleSlug?: string;
  statusDisplay: string;
  timestamp?: string;
  lang?: string;
};

export type StudentAnalytics = {
  id: string;
  name: string;
  leetcodeUsername: string;
  githubUsername: string;
  leetcode: {
    easy: number;
    medium: number;
    hard: number;
    totalSolved: number;
    consistencyScore: number;
    recentSubmissions: RecentSubmission[];
    lastActivityAt: string | null;
  };
  github: {
    repos: number;
    commitsLast7Days: number;
    activityLevel: GithubActivityLevel;
    lastActivityAt: string | null;
  };
  activityStatus: ActivityStatus;
  placementScore: number;
  finalStatus: FinalStatus;
  fetchedAt: string;
  errors?: string[];
};

export type DashboardSummary = {
  readyPct: number;
  atRiskPct: number;
  inactivePct: number;
  avgScore: number;
};

export type DashboardAlerts = {
  inactiveCount: number;
  belowThreshold: Array<{ id: string; name: string; placementScore: number }>;
  topPerformers: Array<{ id: string; name: string; placementScore: number }>;
};

export type StudentsApiResponse = {
  generatedAt: string;
  cached: boolean;
  cacheExpiresAt: string;
  summary: DashboardSummary;
  alerts: DashboardAlerts;
  students: StudentAnalytics[];
};
