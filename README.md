Trackly — Placement Readiness Dashboard

A full-stack placement intelligence system that tracks coding readiness using LeetCode + GitHub

A centralized dashboard that aggregates student coding activity and converts it into actionable placement insights

link
github

What problem this solves

Placement teams don’t have a single source of truth for student coding readiness.

LeetCode progress is separate
GitHub activity is separate
No unified scoring system
No early alerts for low performers

This leads to missed opportunities and poor visibility during placements.

What I built

Trackly is a data-driven readiness dashboard that:

Aggregates LeetCode and GitHub data
Computes a derived readiness score
Identifies top performers, inactive students, and at-risk candidates
Provides a real-time, actionable dashboard for placement teams
How it works
Fetches data from:
LeetCode (GraphQL)
GitHub API
Processes:
Problem-solving stats
Contribution activity
Derived scoring logic
Stores:
MongoDB with per-student caching (30 minutes)
Serves:
Clean API endpoints via Next.js
Displays:
Interactive dashboard with filters, reports, and alerts
Key Features
Smart Dashboard
Summary cards for quick insights
Search and status filters
Interactive student table
Detail drawer with deep breakdown
Reports System
Lookup by name or roll number
Full student performance report
Alerts Engine
Inactive students
Low performers
Top performers
Backend System
Full CRUD APIs
Intelligent caching layer
Graceful API fallback (stale data handling)
Tech Stack
Frontend: Next.js (App Router), React, TypeScript
Styling: Tailwind CSS
Backend: Next.js API Routes
Database: MongoDB with Mongoose
APIs: LeetCode GraphQL, GitHub API
Engineering Highlights
Designed a resilient data layer with fallback to cached data
Built API aggregation logic combining multiple external sources
Implemented a derived scoring system instead of relying on raw metrics
Optimized performance using a per-student caching strategy
Created a modular and scalable full-stack architecture
What to look at (Screenshots)
Dashboard overview showing system insights
Student table with filters and interactions
Detailed report view showing data depth
Why this project stands out

This is not just a CRUD dashboard.

It demonstrates:

Real-world data aggregation system design
Analytics thinking through derived metrics and scoring
Backend resilience and caching strategies
Full-stack product thinking
Impact
Enables placement teams to make faster, data-driven decisions
Helps identify placement-ready candidates early
Reduces manual tracking effort significantly

