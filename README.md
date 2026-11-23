# Backlink Manager (Google Sheets-Style Multi-Spreadsheet Platform)

A production-grade multi-spreadsheet application with the look, feel, and keyboard navigation of Google Sheets, backed by persistent GitHub repository storage (`arsal73500-beep/Spreadsheet`).

---

## 💻 How to Open and Run on Your Laptop

### Quick Start (3 Steps)

1. **Open PowerShell or Terminal** in the project folder:
   ```powershell
   cd D:\laragon\www\Spreadsheet
   ```

2. **Start the Development Server**:
   ```powershell
   npm run dev
   ```

3. **Open Your Browser**:
   Open Google Chrome, Microsoft Edge, or Firefox and go to:
   ```
   http://localhost:3000
   ```

*(Optional) Create a Desktop Shortcut:*
Right-click your Desktop → **New** → **Shortcut** → Enter `http://localhost:3000` → Name it **"Backlink Manager"**.

---

## 🌟 What's New: Multi-Spreadsheet Manager

### 1. Google Sheets Home Dashboard (`/`)
- **Spreadsheet Icon & Home Navigation**: Browse all your spreadsheets in one unified view.
- **Create New Spreadsheet**: Start with `+ Blank spreadsheet` or choose from pre-built templates (`Backlink Tracker`, `Local Citations`, `Healthcare Outreach`).
- **Client Workspaces**:
  - **MD Health Center**: Multiple spreadsheets (e.g. *Backlink Tracker*, *Local Citations*, *High Authority Directories*).
  - **AINT Foundation**: Multiple spreadsheets (e.g. *Backlink Tracker*, *Mental Health Directories*).
  - **Dr. Irshad Malik**: Multiple spreadsheets (e.g. *Backlink Tracker*, *Healthcare Outreach*).
  - **General / Personal**: Standalone spreadsheets not tied to any client.
- **Spreadsheet Lifecycle**:
  - Open, Rename inline or via dialog, Duplicate, Star / Favourite, Archive / Restore, and Delete with confirmation.
- **Search & Sort**: Filter across all spreadsheets by name, workspace, or owner; sort by Last Modified, Date Created, or Title.

### 2. Google Sheets Editor (`/sheets/[spreadsheetId]`)
- **Permanent Unique IDs**: Every spreadsheet has its own isolated ID (e.g. `sheet_1795...`) and separate storage file.
- **Inline Title Renaming**: Click the title to edit directly like in Google Sheets.
- **Back to Spreadsheets**: Return to the dashboard at any time.
- **Google Sheets Features**:
  - Sticky numbered rows (`1, 2, 3...`) and lettered column headers (`A, B, C...`).
  - Active cell bounding box with Google Sheets blue border and drag handle.
  - Formula Bar with coordinate display (`fx` and active cell address like `B4`).
  - Keyboard navigation (Arrow keys, Enter, Tab, Esc, Delete).
  - Undo (`Ctrl+Z`) and Redo (`Ctrl+Y`) stacks.
  - Multi-field filters & column visibility toggles.
  - Full CSV Import wizard with preview and CSV Export.

### 3. Real-Time GitHub Persistence
- Automatic background saving with debounced commits.
- Commit status badges: `Saved locally`, `Syncing to GitHub...`, `Synced to GitHub`, `Sync failed`, and `Retry`.
- SHA conflict detection prevents accidental overwrites when remote repository changes.
- Dual storage engine: Seamlessly falls back to local JSON cache when working offline or before GitHub token is configured.

### 4. Authentication & Role Permissions
- Dedicated `/login` and `/register` pages with Auth.js / NextAuth.
- Authentication options:
  - **Continue with Google**
  - **Continue with GitHub**
  - **Continue with Vercel**
  - **Email and Password**
  - **Instant Test Role Sign In** (Admin, Editor, Viewer) for immediate testing.
- Strict Role-Based Access Control (RBAC):
  - **Administrator**: Full access, create/delete spreadsheets, edit all data, manage GitHub settings.
  - **Editor**: View spreadsheets, add/edit records, import/export data.
  - **Viewer**: Read-only access, search, filter, export CSV.

### 5. Scalable Repository Directory Structure
```
data/
├── workspaces/
│   └── workspaces.json           # Definitions for client workspaces
├── spreadsheets/
│   ├── [spreadsheet-id]/
│   │   ├── metadata.json         # Title, client, owner, dates, star, archive
│   │   ├── backlinks.json        # Individual spreadsheet records
│   │   └── settings.json         # Column visibility, sorting, preferences
└── schemas/
    └── backlink-schema.json
```

---

## 🤖 ChatGPT & SEO Automation REST APIs

Automated SEO workflows can create spreadsheets, read data, and append researched opportunities:

- `GET /api/workspaces` — List workspaces with spreadsheet counts
- `GET /api/spreadsheets` — List spreadsheets (supports `workspaceId`, `starred`, `archived`, `search`)
- `POST /api/spreadsheets` — Create a new spreadsheet
- `GET /api/spreadsheets/[id]` — Read metadata & backlink records
- `PATCH /api/spreadsheets/[id]` — Rename, star, or archive spreadsheet
- `DELETE /api/spreadsheets/[id]` — Delete spreadsheet
- `POST /api/spreadsheets/[id]/duplicate` — Duplicate spreadsheet
- `POST /api/spreadsheets/[id]/records` — Batch update / auto-save records
- `POST /api/spreadsheets/[id]/research` — ChatGPT opportunity injection:
  ```bash
  curl -X POST http://localhost:3000/api/spreadsheets/sheet_md_backlinks_01/research \
    -H "Content-Type: application/json" \
    -H "x-user-role: admin" \
    -d '{
      "domain": "medicalnewsbulletin.com",
      "dr": 85,
      "da": 79,
      "organicTraffic": 820000,
      "category": "Guest Post",
      "notes": "Researched via ChatGPT crawler"
    }'
  ```

---

## ☁️ Vercel Deployment

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete Google Sheets Multi-Spreadsheet platform"
   git push origin main
   ```
2. Import `arsal73500-beep/Spreadsheet` into [Vercel](https://vercel.com).
3. Set Environment Variables:
   - `GITHUB_TOKEN`: Your GitHub Personal Access Token (with `repo` scope).
   - `GITHUB_OWNER`: `arsal73500-beep`
   - `GITHUB_REPO`: `Spreadsheet`
   - `GITHUB_BRANCH`: `main`
   - `AUTH_SECRET`: A secure random secret string.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` *(optional for Google OAuth)*
   - `GITHUB_ID` / `GITHUB_SECRET` *(optional for GitHub OAuth)*
4. Click **Deploy**.
