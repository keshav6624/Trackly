import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { seededStudents } from "@/lib/students";
import {
  buildAlerts,
  buildSummary,
  calculatePlacementScore,
  getActivityStatus,
  getFinalStatus,
  getGithubActivityLevel,
} from "@/lib/scoring";
import { RecentSubmission, StudentAnalytics, StudentsApiResponse } from "@/lib/types";
import { StudentModel } from "@/models/Student";
import { fetchLeetCodeData } from "@/utils/leetcode";

const GITHUB_BASE_URL = "https://api.github.com";
const CACHE_TTL_MS = 30 * 60 * 1000;
const inMemoryStudents: any[] = [];

type JsonFetchResult = {
  data: any | null;
  error: string | null;
};

type GithubPublicData = {
  repos: number | null;
  commitsLast7Days: number;
  lastActive: Date | null;
};

const buildEmptyStudentRecord = (input: {
  id: string;
  name: string;
  leetcodeUsername: string;
  githubUsername: string;
  warnings?: string[];
}) => ({
  _id: `mem-${input.id}`,
  id: input.id,
  name: input.name,
  leetcodeUsername: input.leetcodeUsername,
  githubUsername: input.githubUsername,
  leetcode: {
    totalSolved: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    consistencyScore: 0,
    recentSubmissions: [],
    lastActivityAt: null,
    lastUpdated: null,
  },
  github: {
    commitsLast7Days: 0,
    repos: 0,
    activityLevel: "Low",
    lastActive: null,
    lastUpdated: null,
  },
  score: 0,
  status: "Inactive",
  lastFetchedAt: null,
  stale: true,
  warnings: input.warnings ?? [],
});

const parseNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseLeetcodeCalendar = (calendar: unknown): Record<string, number> => {
  if (!calendar || typeof calendar !== "object") return {};
  const maybeCalendar = calendar as { submissionCalendar?: unknown };

  if (typeof maybeCalendar.submissionCalendar === "string") {
    try {
      const parsed = JSON.parse(maybeCalendar.submissionCalendar) as Record<string, number>;
      return parsed;
    } catch {
      return {};
    }
  }

  if (typeof maybeCalendar.submissionCalendar === "object" && maybeCalendar.submissionCalendar) {
    return maybeCalendar.submissionCalendar as Record<string, number>;
  }

  return {};
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const calculateConsistency = (calendarMap: Record<string, number>): { consistencyScore: number; lastActive: Date | null } => {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowSec = 30 * 24 * 60 * 60;
  let activeDays = 0;
  let lastActiveTs = 0;

  for (const [timestampSec, count] of Object.entries(calendarMap)) {
    const ts = Number(timestampSec);
    if (!Number.isFinite(ts)) continue;

    if (ts >= nowSec - windowSec && parseNumber(count) > 0) {
      activeDays += 1;
    }

    if (parseNumber(count) > 0 && ts > lastActiveTs) {
      lastActiveTs = ts;
    }
  }

  return {
    consistencyScore: Math.round((activeDays / 30) * 100),
    lastActive: lastActiveTs > 0 ? new Date(lastActiveTs * 1000) : null,
  };
};

const normalizeSubmission = (submission: any, index: number): RecentSubmission => {
  const timestampRaw = submission.timestamp ?? submission.timeStamp ?? submission.submissionDate;
  const timestampNumber = parseNumber(timestampRaw);

  return {
    id: String(submission.id ?? `${submission.title ?? "submission"}-${index}`),
    title: String(submission.title ?? submission.titleSlug ?? "Unknown Problem"),
    titleSlug: submission.titleSlug ? String(submission.titleSlug) : undefined,
    statusDisplay: String(submission.statusDisplay ?? submission.status ?? "Unknown"),
    timestamp: timestampNumber > 0 ? new Date(timestampNumber * 1000).toISOString() : undefined,
    lang: submission.lang ? String(submission.lang) : undefined,
  };
};

const findDifficultyCount = (
  rows: unknown,
  difficulty: "Easy" | "Medium" | "Hard",
): number => {
  if (!Array.isArray(rows)) return 0;

  const row = rows.find(
    (entry) =>
      typeof entry === "object" &&
      entry &&
      String((entry as { difficulty?: unknown }).difficulty) === difficulty,
  ) as { count?: unknown } | undefined;

  return parseNumber(row?.count);
};

const getGithubHeaders = () => {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Trackly",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const fetchJsonFromUrl = async (url: string, init?: RequestInit): Promise<JsonFetchResult> => {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...init,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const rateLimitMatched = errorText.includes("API rate limit exceeded");
      return {
        data: null,
        error: rateLimitMatched
          ? "GitHub API rate limit exceeded. Set GITHUB_TOKEN in .env.local."
          : `GitHub request failed with HTTP ${response.status}`,
      };
    }

    const data = await safeReadJson(response);
    return data ? { data, error: null } : { data: null, error: "GitHub response was not valid JSON" };
  } catch {
    return { data: null, error: "GitHub request failed" };
  }
};

const fetchTextFromUrl = async (
  url: string,
  init?: RequestInit,
): Promise<{ text: string | null; error: string | null }> => {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...init,
    });

    if (!response.ok) {
      return {
        text: null,
        error: `GitHub request failed with HTTP ${response.status}`,
      };
    }

    return { text: await response.text(), error: null };
  } catch {
    return { text: null, error: "GitHub request failed" };
  }
};

const githubMonthMap: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const inferGithubContributionDate = (monthName: string, day: number): Date | null => {
  const monthIndex = githubMonthMap[monthName.toLowerCase()];
  if (typeof monthIndex !== "number") return null;

  const now = new Date();
  let year = now.getFullYear();
  if (monthIndex > now.getMonth() || (monthIndex === now.getMonth() && day > now.getDate())) {
    year -= 1;
  }

  const candidate = new Date(year, monthIndex, day);
  return Number.isFinite(candidate.getTime()) ? candidate : null;
};

const parseGithubContributionHtml = (html: string): GithubPublicData => {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 7);
  windowStart.setHours(0, 0, 0, 0);

  let commitsLast7Days = 0;
  let lastActive: Date | null = null;

  const matches = html.matchAll(/(\d+)\s+contributions?\s+on\s+([A-Za-z]+)\s+(\d+)(?:st|nd|rd|th)\./g);
  for (const match of matches) {
    const count = Number(match[1]);
    const monthName = match[2];
    const day = Number(match[3]);
    const date = inferGithubContributionDate(monthName, day);

    if (!date || !Number.isFinite(date.getTime())) continue;
    if (count > 0 && date >= windowStart && date <= now) {
      commitsLast7Days += count;
    }
    if (count > 0 && (!lastActive || date > lastActive)) {
      lastActive = date;
    }
  }

  return { repos: null, commitsLast7Days, lastActive };
};

const parseGithubReposFromProfileHtml = (html: string): number | null => {
  const directMatch = html.match(/Repositories\s+(\d+)/i) ?? html.match(/(\d+)\s+repositories?/i);
  if (!directMatch) return null;
  const count = Number(directMatch[1]);
  return Number.isFinite(count) ? count : null;
};

const fetchGithubPublicData = async (username: string): Promise<GithubPublicData | null> => {
  const headers = { "User-Agent": "Trackly" };

  const [profileResult, contributionsResult] = await Promise.all([
    fetchTextFromUrl(`https://github.com/${encodeURIComponent(username)}`, { headers }),
    fetchTextFromUrl(`https://github.com/users/${encodeURIComponent(username)}/contributions`, { headers }),
  ]);

  if (!profileResult.text && !contributionsResult.text) {
    return null;
  }

  const contributionData = contributionsResult.text ? parseGithubContributionHtml(contributionsResult.text) : {
    repos: null,
    commitsLast7Days: 0,
    lastActive: null,
  };

  return {
    repos: profileResult.text ? parseGithubReposFromProfileHtml(profileResult.text) : null,
    commitsLast7Days: contributionData.commitsLast7Days,
    lastActive: contributionData.lastActive,
  };
};

const getStoredWarnings = (record: any): string[] => {
  const source = Array.isArray(record?.warnings)
    ? record.warnings
    : Array.isArray(record?.errors)
      ? record.errors
      : [];

  return source.filter((item: unknown): item is string => typeof item === "string");
};

const ensureSeedStudents = async () => {
  const count = await StudentModel.countDocuments();
  if (count > 0) return;

  await StudentModel.insertMany(
    seededStudents.map((student) => ({
      ...student,
      leetcode: {
        totalSolved: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        consistencyScore: 0,
        recentSubmissions: [],
        lastActivityAt: null,
        lastUpdated: null,
      },
      github: {
        commitsLast7Days: 0,
        repos: 0,
        activityLevel: "Low",
        lastActive: null,
        lastUpdated: null,
      },
      score: 0,
      status: "Inactive",
      lastFetchedAt: null,
      stale: false,
      warnings: [],
    })),
  );
};

const getLastSubmissionDate = (recentSubmissions: RecentSubmission[]): Date | null => {
  const timestamps = recentSubmissions
    .map((submission) => (submission.timestamp ? new Date(submission.timestamp).getTime() : 0))
    .filter((time) => Number.isFinite(time) && time > 0);

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps));
};

const countGithubCommitsLast7Days = (events: any[]): { commits: number; lastActivity: Date | null } => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let commits = 0;
  let lastActivity: Date | null = null;

  for (const event of events) {
    const createdAtRaw = event?.created_at;
    if (!createdAtRaw) continue;

    const eventDate = new Date(createdAtRaw);
    if (!Number.isFinite(eventDate.getTime())) continue;

    if (!lastActivity || eventDate > lastActivity) {
      lastActivity = eventDate;
    }

    if (eventDate.getTime() < sevenDaysAgo) continue;

    if (event?.type === "PushEvent") {
      const commitCount = Array.isArray(event?.payload?.commits) ? event.payload.commits.length : 0;
      commits += commitCount;
    }
  }

  return { commits, lastActivity };
};

const mapToAnalytics = (record: any): StudentAnalytics => {
  const leetcodeLastActivity = toDate(record?.leetcode?.lastActivityAt);
  const githubLastActivity = toDate(record?.github?.lastActive);
  const candidateDates = [leetcodeLastActivity, githubLastActivity].filter(
    (date): date is Date => Boolean(date),
  );
  const combinedLastActivity =
    candidateDates.length > 0
      ? new Date(Math.max(...candidateDates.map((date) => date.getTime())))
      : null;

  const baseErrors = getStoredWarnings(record);

  return {
    id: String(record.id),
    name: String(record.name),
    leetcodeUsername: String(record.leetcodeUsername),
    githubUsername: String(record.githubUsername),
    leetcode: {
      easy: parseNumber(record?.leetcode?.easy),
      medium: parseNumber(record?.leetcode?.medium),
      hard: parseNumber(record?.leetcode?.hard),
      totalSolved: parseNumber(record?.leetcode?.totalSolved),
      consistencyScore: parseNumber(record?.leetcode?.consistencyScore),
      recentSubmissions: Array.isArray(record?.leetcode?.recentSubmissions)
        ? record.leetcode.recentSubmissions.map((submission: any, index: number) => ({
          id: String(submission?.id ?? `${record.id}-submission-${index}`),
          title: String(submission?.title ?? "Unknown Problem"),
          statusDisplay: String(submission?.statusDisplay ?? "Unknown"),
          timestamp: submission?.timestamp ? new Date(submission.timestamp).toISOString() : undefined,
          lang: submission?.lang ? String(submission.lang) : undefined,
        }))
        : [],
      lastActivityAt: leetcodeLastActivity?.toISOString() ?? null,
    },
    github: {
      repos: parseNumber(record?.github?.repos),
      commitsLast7Days: parseNumber(record?.github?.commitsLast7Days),
      activityLevel: getGithubActivityLevel(parseNumber(record?.github?.commitsLast7Days)),
      lastActivityAt: githubLastActivity?.toISOString() ?? null,
    },
    activityStatus: getActivityStatus(combinedLastActivity),
    placementScore: parseNumber(record?.score),
    finalStatus: getFinalStatus(parseNumber(record?.score)),
    fetchedAt: record?.lastFetchedAt ? new Date(record.lastFetchedAt).toISOString() : new Date(0).toISOString(),
    ...(baseErrors.length > 0 || record?.stale
      ? {
        errors: [
          ...baseErrors,
          ...(record?.stale ? ["Using stale cached data due to API fetch issues"] : []),
        ],
      }
      : {}),
  };
};

const refreshStudentIfNeeded = async (record: any, githubHeaders: Record<string, string>) => {
  const lastFetchedAt = toDate(record?.lastFetchedAt);
  const now = Date.now();

  if (lastFetchedAt && now - lastFetchedAt.getTime() < CACHE_TTL_MS && !record?.stale) {
    return record;
  }

  try {
    const errors: string[] = [];

    const leetcodeProfilePayload = await fetchLeetCodeData(record.leetcodeUsername);
    const githubToken = process.env.GITHUB_TOKEN?.trim();
    let githubUserPayload: any | null = null;
    let githubEventsPayload: any[] | null = null;
    let githubFallbackData: GithubPublicData | null = null;

    if (githubToken) {
      const githubUserResult = await fetchJsonFromUrl(
        `${GITHUB_BASE_URL}/users/${encodeURIComponent(String(record.githubUsername ?? ""))}`,
        {
          headers: githubHeaders,
        },
      );

      const githubEventsResult = await fetchJsonFromUrl(
        `${GITHUB_BASE_URL}/users/${encodeURIComponent(String(record.githubUsername ?? ""))}/events`,
        {
          headers: githubHeaders,
        },
      );

      githubUserPayload = githubUserResult.data;
      githubEventsPayload = githubEventsResult.data;

      if (!githubUserPayload || !githubEventsPayload) {
        githubFallbackData = await fetchGithubPublicData(record.githubUsername);
      }

      if (!leetcodeProfilePayload) errors.push("LeetCode profile unavailable");
      if (!githubUserPayload && !githubFallbackData) {
        errors.push(githubUserResult.error ?? "GitHub profile unavailable");
      }
      if (!githubEventsPayload && !githubFallbackData) {
        errors.push(githubEventsResult.error ?? "GitHub events unavailable");
      }
    } else {
      githubFallbackData = await fetchGithubPublicData(record.githubUsername);

      if (!leetcodeProfilePayload) errors.push("LeetCode profile unavailable");
      if (!githubFallbackData) {
        errors.push("GitHub profile unavailable");
        errors.push("GitHub events unavailable");
      }
    }

    const hadPreviousCache = Boolean(lastFetchedAt);

    if (errors.length > 0 && hadPreviousCache) {
      await StudentModel.updateOne(
        { _id: record._id },
        {
          $set: {
            stale: true,
            warnings: errors,
          },
        },
      );

      return {
        ...record,
        stale: true,
        warnings: errors,
      };
    }

    const easy =
      parseNumber(leetcodeProfilePayload?.easySolved) ||
      findDifficultyCount(leetcodeProfilePayload?.matchedUserStats?.acSubmissionNum, "Easy");
    const medium =
      parseNumber(leetcodeProfilePayload?.mediumSolved) ||
      findDifficultyCount(leetcodeProfilePayload?.matchedUserStats?.acSubmissionNum, "Medium");
    const hard =
      parseNumber(leetcodeProfilePayload?.hardSolved) ||
      findDifficultyCount(leetcodeProfilePayload?.matchedUserStats?.acSubmissionNum, "Hard");
    const totalSolved = parseNumber(leetcodeProfilePayload?.totalSolved) || easy + medium + hard;

    const calendarMap = parseLeetcodeCalendar(leetcodeProfilePayload);
    const consistency = calculateConsistency(calendarMap);

    const submissionsRaw = Array.isArray(leetcodeProfilePayload?.recentSubmissions)
      ? leetcodeProfilePayload.recentSubmissions
      : [];
    const recentSubmissions = submissionsRaw.slice(0, 10).map(normalizeSubmission);
    const lastSubmissionActivity = getLastSubmissionDate(recentSubmissions);

    const commitsAndActivity = Array.isArray(githubEventsPayload)
      ? countGithubCommitsLast7Days(githubEventsPayload)
      : {
          commits: githubFallbackData?.commitsLast7Days ?? 0,
          lastActivity: githubFallbackData?.lastActive ?? null,
        };

    const repoCount =
      githubUserPayload?.public_repos === undefined || githubUserPayload?.public_repos === null
        ? githubFallbackData?.repos ?? 0
        : parseNumber(githubUserPayload.public_repos);

    const placementScore = calculatePlacementScore({
      totalSolved,
      consistencyScore: consistency.consistencyScore,
      commitsLast7Days: commitsAndActivity.commits,
      repoCount,
    });

    const nowDate = new Date();

    await StudentModel.updateOne(
      { _id: record._id },
      {
        $set: {
          leetcode: {
            totalSolved,
            easy,
            medium,
            hard,
            consistencyScore: consistency.consistencyScore,
            recentSubmissions,
            lastActivityAt:
              lastSubmissionActivity?.toISOString() ?? consistency.lastActive?.toISOString() ?? null,
            lastUpdated: nowDate,
          },
          github: {
            commitsLast7Days: commitsAndActivity.commits,
            repos: repoCount,
            activityLevel: getGithubActivityLevel(commitsAndActivity.commits),
            lastActive: commitsAndActivity.lastActivity?.toISOString() ?? null,
            lastUpdated: nowDate,
          },
          score: placementScore,
          status: getFinalStatus(placementScore),
          lastFetchedAt: nowDate,
          stale: errors.length > 0,
          warnings: errors,
        },
      },
    );

    return {
      ...record,
      leetcode: {
        totalSolved,
        easy,
        medium,
        hard,
        consistencyScore: consistency.consistencyScore,
        recentSubmissions,
        lastActivityAt: lastSubmissionActivity?.toISOString() ?? consistency.lastActive?.toISOString() ?? null,
        lastUpdated: nowDate,
      },
      github: {
        commitsLast7Days: commitsAndActivity.commits,
        repos: repoCount,
        activityLevel: getGithubActivityLevel(commitsAndActivity.commits),
        lastActive: commitsAndActivity.lastActivity?.toISOString() ?? null,
        lastUpdated: nowDate,
      },
      score: placementScore,
      status: getFinalStatus(placementScore),
      lastFetchedAt: nowDate,
      stale: errors.length > 0,
      warnings: errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refresh error";
    const fallbackErrors = [...getStoredWarnings(record), message];

    await StudentModel.updateOne(
      { _id: record._id },
      {
        $set: {
          stale: true,
          warnings: fallbackErrors,
        },
      },
    ).catch(() => null);

    return {
      ...record,
      stale: true,
      warnings: fallbackErrors,
    };
  }
};

export async function GET() {
  try {
    await dbConnect();
    await ensureSeedStudents();

    const githubHeaders = getGithubHeaders();
    const records = await StudentModel.find().sort({ id: 1 }).lean();
    const resolvedRecords: any[] = [];
    for (const record of records) {
      try {
        resolvedRecords.push(await refreshStudentIfNeeded(record, githubHeaders));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown student refresh error";
        resolvedRecords.push({
          ...record,
          stale: true,
          warnings: [...getStoredWarnings(record), message],
        });
      }
    }
    const combinedRecords = [...resolvedRecords];
    for (const memoryRecord of inMemoryStudents) {
      if (!combinedRecords.some((record) => String(record?.id) === String(memoryRecord?.id))) {
        combinedRecords.push(memoryRecord);
      }
    }

    const analytics = combinedRecords.map(mapToAnalytics);

    const payload: StudentsApiResponse = {
      generatedAt: new Date().toISOString(),
      cached: true,
      cacheExpiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      summary: buildSummary(analytics),
      alerts: buildAlerts(analytics),
      students: analytics,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const fallbackRecords = inMemoryStudents.map((record) => ({
      ...record,
      errors: [
        ...(Array.isArray(record?.warnings)
          ? record.warnings.filter((entry: unknown): entry is string => typeof entry === "string")
          : []),
        error instanceof Error ? error.message : "Unknown error",
      ],
    }));
    const fallbackAnalytics = fallbackRecords.map(mapToAnalytics);

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        cached: true,
        cacheExpiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
        summary: buildSummary(fallbackAnalytics),
        alerts: buildAlerts(fallbackAnalytics),
        students: fallbackAnalytics,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 200 },
    );
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  // Sanitize inputs: trim and enforce max lengths to prevent abuse
  const id = typeof payload?.id === "string" ? payload.id.trim().slice(0, 50) : "";
  const name = typeof payload?.name === "string" ? payload.name.trim().slice(0, 200) : "";
  const leetcodeUsername =
    typeof payload?.leetcodeUsername === "string" ? payload.leetcodeUsername.trim().slice(0, 100) : "";
  const githubUsername =
    typeof payload?.githubUsername === "string" ? payload.githubUsername.trim().slice(0, 100) : "";

  // Block MongoDB operator injection in ID
  if (id.includes("$") || id.includes("{") || id.includes(".")) {
    return NextResponse.json({ message: "Invalid student ID format" }, { status: 400 });
  }

  if (!id || !name || !leetcodeUsername || !githubUsername) {
    return NextResponse.json(
      {
        message: "All fields are required: id, name, leetcodeUsername, githubUsername",
      },
      { status: 400 },
    );
  }

  try {
    await dbConnect();

    const exists = await StudentModel.findOne({ id }).lean();

    if (exists) {
      return NextResponse.json(
        {
          message: `Student with ID ${id} already exists`,
        },
        { status: 409 },
      );
    }

    const student = await StudentModel.create({
      id,
      name,
      leetcodeUsername,
      githubUsername,
      leetcode: {
        totalSolved: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        consistencyScore: 0,
        recentSubmissions: [],
        lastActivityAt: null,
        lastUpdated: null,
      },
      github: {
        commitsLast7Days: 0,
        repos: 0,
        activityLevel: "Low",
        lastActive: null,
        lastUpdated: null,
      },
      score: 0,
      status: "Inactive",
      lastFetchedAt: null,
      stale: false,
      warnings: [],
    });

    return NextResponse.json(
      {
        message: "Student added",
        student: {
          id: student.id,
          name: student.name,
          leetcodeUsername: student.leetcodeUsername,
          githubUsername: student.githubUsername,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const duplicateInMemory = inMemoryStudents.some((student) => String(student?.id) === id);
    if (duplicateInMemory) {
      return NextResponse.json(
        {
          message: `Student with ID ${id} already exists`,
        },
        { status: 409 },
      );
    }

    const record = buildEmptyStudentRecord({
      id,
      name,
      leetcodeUsername,
      githubUsername,
      warnings: [
        "Saved in memory because database is unavailable",
        error instanceof Error ? error.message : "Unknown database error",
      ],
    });
    inMemoryStudents.push(record);

    return NextResponse.json(
      {
        message: "Student added",
        warning: "Database unavailable. Student stored in memory for this server session.",
        student: {
          id: record.id,
          name: record.name,
          leetcodeUsername: record.leetcodeUsername,
          githubUsername: record.githubUsername,
        },
      },
      { status: 201 },
    );
  }
}
