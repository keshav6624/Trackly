import type { RecentSubmission } from "@/lib/types";

type LeetCodeProfileStats = {
  difficulty: string;
  count: number;
};

type LeetCodeProfileData = {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking: number;
  reputation: number;
  avatar: string;
  submissionCalendar: string;
  recentSubmissions: RecentSubmission[];
  matchedUserStats: {
    acSubmissionNum: LeetCodeProfileStats[];
  };
};

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

const parseNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getCount = (stats: LeetCodeProfileStats[], difficulty: "All" | "Easy" | "Medium" | "Hard") => {
  return parseNumber(stats.find((entry) => entry.difficulty === difficulty)?.count);
};

const normalizeSubmission = (submission: any, index: number): RecentSubmission => ({
  id: String(submission.id ?? `${submission.title ?? "submission"}-${index}`),
  title: String(submission.title ?? submission.titleSlug ?? "Unknown Problem"),
  titleSlug: submission.titleSlug ? String(submission.titleSlug) : undefined,
  statusDisplay: String(submission.statusDisplay ?? submission.status ?? "Unknown"),
  timestamp: submission.timestamp ? new Date(Number(submission.timestamp) * 1000).toISOString() : undefined,
  lang: submission.lang ? String(submission.lang) : undefined,
});

export const fetchLeetCodeData = async (username: string): Promise<LeetCodeProfileData | null> => {
  const query = `#graphql
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    submitStats {
      acSubmissionNum {
        difficulty
        count
      }
      totalSubmissionNum {
        difficulty
        count
      }
    }
    profile {
      ranking
      reputation
      userAvatar
    }
    submissionCalendar
  }
  recentSubmissionList(username: $username) {
    title
    titleSlug
    timestamp
    statusDisplay
    lang
  }
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({ query, variables: { username } }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const matchedUser = json?.data?.matchedUser;

    if (!matchedUser) {
      throw new Error("User not found");
    }

    const acSubmissionNum = Array.isArray(matchedUser?.submitStats?.acSubmissionNum)
      ? matchedUser.submitStats.acSubmissionNum.map((entry: any) => ({
          difficulty: String(entry?.difficulty ?? "Unknown"),
          count: parseNumber(entry?.count),
        }))
      : [];

    const recentSubmissions = Array.isArray(json?.data?.recentSubmissionList)
      ? json.data.recentSubmissionList.map(normalizeSubmission)
      : [];

    return {
      totalSolved: getCount(acSubmissionNum, "All"),
      easySolved: getCount(acSubmissionNum, "Easy"),
      mediumSolved: getCount(acSubmissionNum, "Medium"),
      hardSolved: getCount(acSubmissionNum, "Hard"),
      ranking: parseNumber(matchedUser.profile?.ranking),
      reputation: parseNumber(matchedUser.profile?.reputation),
      avatar: String(matchedUser.profile?.userAvatar ?? ""),
      submissionCalendar: String(matchedUser.submissionCalendar ?? "{}"),
      recentSubmissions,
      matchedUserStats: {
        acSubmissionNum,
      },
    };
  } catch (error) {
    console.error("LeetCode GraphQL Error:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};