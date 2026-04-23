# 🚀 Trackly — Placement Readiness Dashboard

> A full-stack **Next.js analytics dashboard** for college placement teams to track student coding readiness using **LeetCode + GitHub insights**.

## 📌 Overview

Trackly helps placement cells **monitor, evaluate, and act** on student performance — all in one place.
It aggregates coding activity, calculates readiness scores, and highlights **top performers, inactive students, and risk cases**.

## ✨ Key Features

### 🔗 Backend API

* `GET /api/students` → Fetch all students
* `POST /api/students` → Add a new student
* `PUT /api/students/:id` → Update student
* `DELETE /api/students/:id` → Remove student

---

### 📊 Data Intelligence

* 🔄 Aggregates **LeetCode + GitHub** data
* 📈 Derived readiness scoring system
* ⚡ Smart caching (30 min per student)
* 🛡️ Graceful fallback to cached data (with stale indicator)

---

### 🖥️ Dashboard UI

* 📂 Collapsible sidebar (Dashboard, Students, Reports, Alerts, Settings)
* 🔍 Search + status filtering
* 📋 Interactive student table with hover actions
* ➕ Add Student modal
* 📊 Summary cards (quick insights)
* 📑 Reports tab (lookup by Roll No / Name)
* 📌 Detail drawer (deep GitHub + LeetCode breakdown)
* 🚨 Alerts panel:

  * Inactive students
  * Low performers
  * Top performers

---

## 🧱 Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Frontend     | Next.js (App Router), React, TypeScript |
| Styling      | Tailwind CSS                            |
| Backend      | Next.js API Routes                      |
| Database     | MongoDB + Mongoose                      |
| Data Sources | LeetCode GraphQL + GitHub API           |

---

## ⚙️ Getting Started

### 1️⃣ Install Dependencies

```bash
npm install
```

---

### 2️⃣ Setup Environment Variables

```bash
cp .env.local.example .env.local
```

Update `.env.local`:

```env
# Recommended for higher GitHub API rate limits
GITHUB_TOKEN=your_token_here

# MongoDB connection string
MONGODB_URI=your_connection_string
```

---

### 3️⃣ Run the App

```bash
npm run dev
```

---

### 4️⃣ Open in Browser

👉 [http://localhost:3000](http://localhost:3000)

---

## 🧠 How It Works

* 📡 Fetches real-time data from:

  * LeetCode (GraphQL)
  * GitHub API
* 🧮 Computes a **readiness score** per student
* 💾 Stores + caches results in MongoDB
* ⚡ Uses cached data if APIs fail (marked as *stale*)

---

## 🗂️ Project Structure

```
├── app/                 # Next.js App Router
├── components/          # UI Components
├── lib/dbConnect.ts     # MongoDB connection
├── models/Student.ts    # Mongoose schema
├── pages/api/           # API routes
└── styles/              # Tailwind config
```

---

## ⚠️ Important Notes

* 🔑 GitHub token is **optional but recommended**
* 📉 Without token → falls back to public GitHub scraping
* 🧊 Cached data ensures **resilience during API failures**
* ❌ No LeetCode proxy needed (direct GraphQL usage)

---

## 🎯 Use Cases

* 🏫 College placement tracking
* 📊 Student performance analytics
* 🎯 Identifying placement-ready candidates
* 🚨 Early detection of low engagement

---

