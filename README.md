# Backlink Manager (GitHub-Backed Google Sheets Alternative)

A production-ready web application designed to replace Google Sheets backlink trackers. Built with Next.js App Router, TypeScript, and Tailwind CSS, Backlink Manager delivers the look, feel, and keyboard navigation of Google Sheets while persisting all backlink records directly to your GitHub repository (`arsal73500-beep/Spreadsheet`).

---

## 🚀 Key Features

- **Google Sheets-Style Interface**: Sticky column headers, row numbers (1, 2, 3...), active cell highlight with formula bar, in-cell editing, dropdown selectors, keyboard navigation (Arrow keys, Enter, Tab, Esc), and column visibility toggle.
- **GitHub Persistent Storage**: Stores records as versioned JSON files directly in GitHub via REST API commits (`@octokit/rest`).
- **Conflict Prevention & Autosave**: Debounced auto-save with SHA comparison prevents overwriting newer remote repository versions.
- **Project Isolation**: Three strictly segregated projects:
  - **MD Health Center** (`data/md-health-center/backlinks.json`)
  - **AINT Foundation** (`data/aint-foundation/backlinks.json`)
  - **Dr Irshad Malik** (`data/dr-irshad-malik/backlinks.json`)
- **Role-Based Access Control (RBAC)**:
  - **Administrator**: Full access, add/edit/delete rows, manage team, configure repository.
  - **Editor**: Add & edit records, update statuses, import CSV.
  - **Viewer**: Read-only, search, filter, export CSV.
- **Google Sheets CSV Migration**: Import CSV files with auto column detection, interactive mapping, live preview, and duplicate prevention.
- **Real-Time Analytics Dashboard**: Real-time stats calculated from stored records (Live, Pending, Submitted, Broken, Referring Domains, Average DR, Average DA, Category & Anchor distributions).
- **ChatGPT & Automated SEO APIs**: Ready-to-use REST endpoints (`/api/projects/[id]/research`) for external AI crawlers and metric providers (Ahrefs, Moz, DataForSEO).

---

## 📁 Repository Directory Structure

```
Backlink-Manager/
├── data/
│   ├── md-health-center/
│   │   └── backlinks.json        # MD Health Center backlink data
│   ├── aint-foundation/
│   │   └── backlinks.json        # AINT Foundation CIC backlink data
│   └── dr-irshad-malik/
│       └── backlinks.json        # Dr Irshad Malik backlink data
├── schemas/
│   └── backlink-schema.json      # JSON Schema definition
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── projects/         # REST API routes (GET, POST, PATCH, DELETE, bulk, history, research)
│   │   ├── globals.css           # Google Sheets CSS styling
│   │   ├── layout.tsx
│   │   └── page.tsx              # Main spreadsheet workspace
│   ├── components/
│   │   ├── navigation/           # TopNav & ProjectTabs
│   │   ├── spreadsheet/          # SpreadsheetGrid, Toolbar, FormulaBar
│   │   ├── dialogs/              # CsvImportModal, SettingsModal, FilterModal
│   │   ├── dashboard/            # MetricsDashboard
│   │   └── api-docs/             # Interactive API explorer
│   └── lib/
│       ├── schema.ts             # Zod schema & TypeScript definitions
│       ├── github.ts             # GitHub REST API client & SHA conflict logic
│       ├── storage.ts            # Dual storage engine (GitHub + local file cache)
│       ├── auth.ts               # User roles & permissions
│       ├── csv-parser.ts         # CSV parsing, mapping, and duplicate check
│       └── projects-config.ts    # Project metadata & isolation config
├── .env.example
├── README.md
├── package.json
└── tailwind.config.ts
```

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- Node.js (v18.17+ or v20+)
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/arsal73500-beep/Spreadsheet.git
cd Spreadsheet
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your GitHub Personal Access Token in `.env.local`:
```env
GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
GITHUB_OWNER=arsal73500-beep
GITHUB_REPO=Spreadsheet
GITHUB_BRANCH=main
```

> **Note**: If `GITHUB_TOKEN` is not yet configured, the application automatically uses the local repository cache (`data/*`) so you can run and test immediately offline.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Production Deployment on Vercel

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete Google Sheets Backlink Manager application"
   git push origin main
   ```
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import the `arsal73500-beep/Spreadsheet` repository.
4. Under **Environment Variables**, add:
   - `GITHUB_TOKEN`: Your GitHub token with `repo` permission.
   - `GITHUB_OWNER`: `arsal73500-beep`
   - `GITHUB_REPO`: `Spreadsheet`
   - `GITHUB_BRANCH`: `main`
5. Click **Deploy**. Vercel will build and deploy the application.

---

## 🤖 ChatGPT & SEO Automation Endpoints

The application provides dedicated REST endpoints for automated backlink discovery, metrics enrichment, and status updates:

### Add / Update Research Opportunity
```http
POST /api/projects/{projectId}/research
Content-Type: application/json
x-user-role: admin

{
  "domain": "forbes.com",
  "backlinkUrl": "https://forbes.com/health-feature",
  "dr": 94,
  "da": 91,
  "organicTraffic": 3500000,
  "category": "Guest Post",
  "notes": "Researched via ChatGPT crawler"
}
```

### Available Endpoints
- `GET /api/projects` - List projects with summary counts
- `GET /api/projects/[id]/backlinks` - Fetch project backlinks and SHA
- `POST /api/projects/[id]/backlinks` - Add new backlink
- `PATCH /api/projects/[id]/backlinks/[recordId]` - Update cell/record
- `DELETE /api/projects/[id]/backlinks/[recordId]` - Delete backlink
- `POST /api/projects/[id]/backlinks/bulk` - Batch update / save grid
- `GET /api/projects/[id]/history` - View GitHub commit log

---

## 🛡️ Security & Data Integrity

- **Server-Side Token Isolation**: GitHub tokens are never exposed in client bundles or public API responses.
- **SHA Conflict Detection**: GitHub commit SHA is checked before every write. If concurrent edits occur, the user is notified with an explicit conflict warning.
- **Input Validation**: All payloads validated with Zod schemas.
- **Version Recovery**: Every update creates a descriptive Git commit, preserving full rollback history in GitHub.
