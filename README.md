# Trackly - Placement Readiness Dashboard

A full-stack Next.js dashboard for college placement teams to track coding readiness from LeetCode and GitHub in one place.

## Features

- Backend aggregation endpoint: `GET /api/students`
- Add student endpoint: `POST /api/students`
- Update student endpoint: `PUT /api/students/:id`
- Delete student endpoint: `DELETE /api/students/:id`
- LeetCode + GitHub data processing with derived scoring
- MongoDB persistence with Mongoose
- Per-student API caching in MongoDB (30 minutes)
- Responsive dashboard with:
  - Collapsible sidebar
  - Interactive sidebar sections (Dashboard, Students, Reports, Alerts, Settings)
  - Reports tab with full student report (name + roll no lookup or saved list selection)
  - Summary cards
  - Search and status filters
  - Add Student modal (Roll No, name, LeetCode username, GitHub username)
  - Student table with hover actions
  - Detail drawer (LeetCode + GitHub breakdown)
  - Alerts panel for inactive, low-score, and top performers
- Graceful API failure fallback to cached data with stale marker

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- Backend via Next.js API Route Handlers

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.local.example .env.local
```

The app reads `.env.local` at runtime. `.env.local.example` is only a template, so make sure the real `.env.local` exists before starting the server.

Then set your token in `.env.local` if you want authenticated GitHub requests:

```env
# Optional, but recommended for higher GitHub API limits.
GITHUB_TOKEN=your_token_here
MONGODB_URI=your_connection_string
```

Trackly queries LeetCode's official GraphQL endpoint directly, so no LeetCode proxy container is required.

3. Run development server:

```bash
npm run dev
```

4. Open:

`http://localhost:3000`

## Notes

- GitHub token is used only on the backend route; when it is missing, Trackly falls back to public GitHub pages.
- If upstream API calls fail, the API returns last cached MongoDB values and marks data as stale.
- MongoDB connection utility is in `lib/dbConnect.ts` and schema is in `models/Student.ts`.
