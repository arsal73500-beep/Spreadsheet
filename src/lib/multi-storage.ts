import fs from "fs";
import path from "path";
import {
  SpreadsheetMetadata,
  SpreadsheetSettings,
  SpreadsheetFullData,
  CreateSpreadsheetInput,
  generateSpreadsheetId,
  generateSheetTabId,
  SheetTab,
  WORKSPACES,
} from "./spreadsheet-schema";
import { BacklinkRecord, createEmptyBacklink } from "./schema";
import {
  readBacklinksFromGitHub,
  writeBacklinksToGitHub,
  readJsonFromGitHub,
  writeJsonToGitHub,
  deleteFileFromGitHub,
  listDirectoryFromGitHub,
  getGitHubConfig,
  isVercelProduction,
} from "./github";

// ─── Local filesystem paths (dev only) ───────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "data");
const SPREADSHEETS_DIR = path.join(DATA_DIR, "spreadsheets");
const WORKSPACES_DIR = path.join(DATA_DIR, "workspaces");

// ─── GitHub path helpers ─────────────────────────────────────────────────────
const GH = {
  metadata: (id: string) => `data/spreadsheets/${id}/metadata.json`,
  settings: (id: string) => `data/spreadsheets/${id}/settings.json`,
  backlinks: (id: string) => `data/spreadsheets/${id}/backlinks.json`,
  tab: (id: string, tabId: string) => `data/spreadsheets/${id}/tabs/${tabId}.json`,
  workspaces: () => `data/workspaces/workspaces.json`,
  spreadsheetsDir: () => `data/spreadsheets`,
};

// ─── Environment helpers ──────────────────────────────────────────────────────
function getToken(customToken?: string): string | undefined {
  return customToken || getGitHubConfig().token || undefined;
}

/** True when we must use GitHub for all storage (Vercel serverless) */
function useGitHubStorage(customToken?: string): boolean {
  return isVercelProduction() || Boolean(getToken(customToken));
}

// ─── Local-only helpers (safe — only called outside Vercel) ──────────────────
function ensureDir(dirPath: string) {
  if (isVercelProduction()) return; // Never mkdir on Vercel
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.warn("ensureDir failed (continuing):", err);
  }
}

function localWriteJson(filePath: string, data: any) {
  if (isVercelProduction()) return;
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("localWriteJson failed (continuing):", err);
  }
}

function localReadJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function localExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function localRemove(filePath: string) {
  if (isVercelProduction()) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  } catch (err) {
    console.warn("localRemove failed:", err);
  }
}

function localRemoveDir(dirPath: string) {
  if (isVercelProduction()) return;
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn("localRemoveDir failed:", err);
  }
}

// ─── GitHub-backed metadata read/write ───────────────────────────────────────
async function ghReadMetadata(
  id: string,
  token: string
): Promise<{ data: SpreadsheetMetadata; sha: string } | null> {
  return readJsonFromGitHub<SpreadsheetMetadata>(GH.metadata(id), token);
}

async function ghWriteMetadata(
  id: string,
  metadata: SpreadsheetMetadata,
  token: string,
  currentSha?: string
): Promise<string> {
  const result = await writeJsonToGitHub(
    GH.metadata(id),
    metadata,
    currentSha,
    `chore(meta): update metadata for spreadsheet "${metadata.title}"`,
    token
  );
  return result.sha;
}

async function ghReadSettings(
  id: string,
  token: string
): Promise<SpreadsheetSettings | null> {
  const result = await readJsonFromGitHub<SpreadsheetSettings>(GH.settings(id), token);
  return result?.data || null;
}

async function ghReadTabRecords(
  id: string,
  tabId: string,
  token: string
): Promise<{ data: BacklinkRecord[]; sha: string } | null> {
  const result = await readJsonFromGitHub<BacklinkRecord[]>(GH.tab(id, tabId), token);
  if (!result) return null;
  return { data: Array.isArray(result.data) ? result.data : [], sha: result.sha };
}

// ─── Normalize metadata (add sheets/activeSheetId if missing) ─────────────────
function applyDefaultSheets(meta: SpreadsheetMetadata): SpreadsheetMetadata {
  if (!Array.isArray(meta.sheets) || meta.sheets.length === 0) {
    meta.sheets = [{ id: "tab_main", name: "Sheet 1", order: 0, recordCount: meta.recordCount || 0 }];
  }
  if (!meta.activeSheetId && meta.sheets.length > 0) {
    meta.activeSheetId = meta.sheets[0].id;
  }
  return meta;
}

// ─── GitHub: normalize metadata (read → patch → write back if changed) ────────
async function ghNormalizeMetadata(id: string, token: string): Promise<SpreadsheetMetadata> {
  const result = await ghReadMetadata(id, token);
  if (!result) throw new Error(`Spreadsheet "${id}" not found in GitHub.`);
  const meta = result.data;
  const needsPatch = !Array.isArray(meta.sheets) || meta.sheets.length === 0 || !meta.activeSheetId;
  const normalized = applyDefaultSheets(meta);
  if (needsPatch) {
    await ghWriteMetadata(id, normalized, token, result.sha);
  }
  return normalized;
}

// ─── Local: normalize metadata ────────────────────────────────────────────────
function localNormalizeMetadata(spreadsheetId: string): SpreadsheetMetadata {
  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  const metaFile = path.join(sheetDir, "metadata.json");
  if (!localExists(metaFile)) {
    throw new Error(`Spreadsheet "${spreadsheetId}" metadata not found locally.`);
  }
  const meta = localReadJson<SpreadsheetMetadata>(metaFile);
  if (!meta) throw new Error(`Failed to parse metadata for "${spreadsheetId}".`);

  const needsPatch = !Array.isArray(meta.sheets) || meta.sheets.length === 0 || !meta.activeSheetId;
  const normalized = applyDefaultSheets(meta);

  if (needsPatch) {
    // If no tab_main file exists, seed from legacy backlinks.json
    const tabsDir = path.join(sheetDir, "tabs");
    ensureDir(tabsDir);
    const tabMainPath = path.join(tabsDir, "tab_main.json");
    if (!localExists(tabMainPath)) {
      const legacy = localReadJson<BacklinkRecord[]>(path.join(sheetDir, "backlinks.json")) || [];
      localWriteJson(tabMainPath, legacy);
    }
    localWriteJson(metaFile, normalized);
  }

  return normalized;
}

// ─── ensureInitialMigration ───────────────────────────────────────────────────
/**
 * On Vercel: ensures GitHub has workspaces + initial spreadsheet data.
 * Locally: ensures local filesystem is bootstrapped.
 * Never overwrites existing spreadsheets.
 */
export async function ensureInitialMigration(customToken?: string) {
  const token = getToken(customToken);
  if (isVercelProduction()) {
    if (!token) return; // Can't do anything without token on Vercel
    await ghEnsureInitialMigration(token);
    return;
  }
  // Local development
  localEnsureInitialMigration();
}

async function ghEnsureInitialMigration(token: string) {
  // Check if data/workspaces/workspaces.json exists; create if not
  const wsResult = await readJsonFromGitHub(GH.workspaces(), token);
  if (!wsResult) {
    await writeJsonToGitHub(
      GH.workspaces(),
      WORKSPACES,
      undefined,
      "chore(init): seed workspace configuration",
      token
    ).catch((e) => console.warn("Could not init workspaces.json on GitHub:", e));
  }

  // List spreadsheets from GitHub
  const dirs = await listDirectoryFromGitHub(GH.spreadsheetsDir(), token);
  const existing = dirs.filter((d) => d.type === "dir").map((d) => d.name);

  if (existing.length > 0) {
    // Normalize any existing metadata that lacks sheets
    for (const id of existing) {
      try {
        await ghNormalizeMetadata(id, token);
      } catch (e) {
        console.warn(`Could not normalize metadata for ${id}:`, e);
      }
    }
    return;
  }

  // Seed default spreadsheets (only if none exist in GitHub)
  const defaultSpreadsheets = buildDefaultSpreadsheets();
  for (const { metadata, tabsRecords, settings } of defaultSpreadsheets) {
    await ghCreateSpreadsheetFiles(metadata, tabsRecords, settings, token);
  }
}

function localEnsureInitialMigration() {
  ensureDir(SPREADSHEETS_DIR);
  ensureDir(WORKSPACES_DIR);

  const wsFile = path.join(WORKSPACES_DIR, "workspaces.json");
  if (!localExists(wsFile)) {
    localWriteJson(wsFile, WORKSPACES);
  }

  const existingDirs = fs
    .readdirSync(SPREADSHEETS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  if (existingDirs.length > 0) {
    for (const dir of existingDirs) {
      try {
        localNormalizeMetadata(dir.name);
      } catch (e) {
        console.warn(`Could not normalize metadata for ${dir.name}:`, e);
      }
    }
    return;
  }

  const defaultSpreadsheets = buildDefaultSpreadsheets();
  for (const { metadata, tabsRecords, settings } of defaultSpreadsheets) {
    localCreateSpreadsheetFiles(metadata, tabsRecords, settings);
  }
}

// ─── Default spreadsheet seed data ───────────────────────────────────────────
function buildDefaultSpreadsheets(): Array<{
  metadata: SpreadsheetMetadata;
  tabsRecords: Record<string, BacklinkRecord[]>;
  settings: SpreadsheetSettings;
}> {
  // Read legacy files locally (empty arrays on Vercel since no fs access)
  function readLegacy(relPath: string): BacklinkRecord[] {
    if (isVercelProduction()) return [];
    return localReadJson<BacklinkRecord[]>(path.join(DATA_DIR, relPath)) || [];
  }

  const mdRecords = readLegacy("md-health-center/backlinks.json");
  const aintRecords = readLegacy("aint-foundation/backlinks.json");
  const drRecords = readLegacy("dr-irshad-malik/backlinks.json");

  const now = new Date().toISOString();
  const defaultSettings: SpreadsheetSettings = { autoExtractDomain: true };

  return [
    {
      metadata: {
        id: "sheet_md_backlinks_01",
        title: "MD Health Center — Backlink Tracker",
        workspaceId: "md-health-center",
        description: "Primary backlink tracker for clinical diagnostic and health awareness",
        owner: "Arsal Malik",
        ownerEmail: "arsal73500@gmail.com",
        createdAt: "2026-10-15T09:00:00.000Z",
        updatedAt: now,
        isStarred: true,
        isArchived: false,
        recordCount: mdRecords.length,
        activeSheetId: "tab_main",
        sheets: [
          { id: "tab_main", name: "Live Backlinks", order: 0, recordCount: mdRecords.length },
          { id: "tab_guest_posts", name: "Guest Posts Pipeline", order: 1, recordCount: 1 },
        ],
      },
      tabsRecords: {
        tab_main: mdRecords,
        tab_guest_posts: [
          {
            ...createEmptyBacklink("medicaljournalonline.org"),
            id: "bl_md_gp_01",
            backlinkUrl: "https://medicaljournalonline.org/preventive-screenings",
            status: "Submitted",
            category: "Guest Post",
            domain: "medicaljournalonline.org",
            dr: 72,
            da: 68,
            organicTraffic: 140000,
            anchorText: "MD Health Center Research",
            linkType: "Dofollow",
            notes: "Editorial draft under review",
          },
        ],
      },
      settings: defaultSettings,
    },
    {
      metadata: {
        id: "sheet_md_citations_02",
        title: "MD Health Center — Local Citations",
        workspaceId: "md-health-center",
        description: "Local clinic map packs, NAP consistency and healthcare directories",
        owner: "Arsal Malik",
        ownerEmail: "arsal73500@gmail.com",
        createdAt: "2026-11-01T10:30:00.000Z",
        updatedAt: now,
        isStarred: false,
        isArchived: false,
        recordCount: 2,
        activeSheetId: "tab_main",
        sheets: [{ id: "tab_main", name: "Sheet 1", order: 0, recordCount: 2 }],
      },
      tabsRecords: {
        tab_main: [
          {
            ...createEmptyBacklink("google.com/business"),
            id: "bl_md_cit_01",
            backlinkUrl: "https://google.com/business/md-health-center",
            status: "Live",
            category: "Local Directory",
            domain: "google.com",
            dr: 98,
            da: 98,
            organicTraffic: 5000000,
            anchorText: "MD Health Center Clinics",
            linkType: "Dofollow",
            notes: "Google Business Profile primary listing",
          },
          {
            ...createEmptyBacklink("bingplaces.com"),
            id: "bl_md_cit_02",
            backlinkUrl: "https://bingplaces.com/md-health-center",
            status: "Submitted",
            category: "Local Directory",
            domain: "bingplaces.com",
            dr: 92,
            da: 90,
            organicTraffic: 1200000,
            anchorText: "MD Health Center",
            linkType: "Dofollow",
            notes: "Bing Places verification submitted",
          },
        ],
      },
      settings: defaultSettings,
    },
    {
      metadata: {
        id: "sheet_aint_backlinks_01",
        title: "AINT Foundation — Backlink Tracker",
        workspaceId: "aint-foundation",
        description: "UK Community Interest Company (CIC) backlink campaign",
        owner: "Arsal Malik",
        ownerEmail: "arsal73500@gmail.com",
        createdAt: "2026-10-10T08:00:00.000Z",
        updatedAt: now,
        isStarred: true,
        isArchived: false,
        recordCount: aintRecords.length,
        activeSheetId: "tab_main",
        sheets: [{ id: "tab_main", name: "Sheet 1", order: 0, recordCount: aintRecords.length }],
      },
      tabsRecords: { tab_main: aintRecords },
      settings: defaultSettings,
    },
    {
      metadata: {
        id: "sheet_dr_backlinks_01",
        title: "Dr. Irshad Malik — Backlink Tracker",
        workspaceId: "dr-irshad-malik",
        description: "ENT surgeon authority profiles, medical directories and guest articles",
        owner: "Arsal Malik",
        ownerEmail: "arsal73500@gmail.com",
        createdAt: "2026-09-15T09:00:00.000Z",
        updatedAt: now,
        isStarred: true,
        isArchived: false,
        recordCount: drRecords.length,
        activeSheetId: "tab_main",
        sheets: [{ id: "tab_main", name: "Sheet 1", order: 0, recordCount: drRecords.length }],
      },
      tabsRecords: { tab_main: drRecords },
      settings: defaultSettings,
    },
    {
      metadata: {
        id: "sheet_general_01",
        title: "General SEO Outreach & Link Opportunities",
        workspaceId: "general",
        description: "Universal backlinks and prospect websites to evaluate",
        owner: "Arsal Malik",
        ownerEmail: "arsal73500@gmail.com",
        createdAt: "2026-11-20T11:00:00.000Z",
        updatedAt: now,
        isStarred: false,
        isArchived: false,
        recordCount: 1,
        activeSheetId: "tab_main",
        sheets: [{ id: "tab_main", name: "Sheet 1", order: 0, recordCount: 1 }],
      },
      tabsRecords: {
        tab_main: [
          {
            ...createEmptyBacklink("hubspot.com"),
            id: "bl_gen_01",
            backlinkUrl: "https://blog.hubspot.com/marketing/community-resources",
            status: "Pending",
            category: "Resource Page",
            domain: "hubspot.com",
            dr: 93,
            da: 92,
            organicTraffic: 8900000,
            anchorText: "Recommended Outreach Tools",
            linkType: "Dofollow",
            notes: "High authority target for editorial collaboration",
          },
        ],
      },
      settings: defaultSettings,
    },
  ];
}

// ─── GitHub: create all files for a new spreadsheet ──────────────────────────
async function ghCreateSpreadsheetFiles(
  metadata: SpreadsheetMetadata,
  tabsRecords: Record<string, BacklinkRecord[]>,
  settings: SpreadsheetSettings,
  token: string
) {
  const id = metadata.id;
  const commitMsg = `feat(spreadsheet): seed "${metadata.title}" [${id}]`;

  // Write metadata
  await writeJsonToGitHub(GH.metadata(id), metadata, undefined, commitMsg, token).catch((e) =>
    console.warn(`Could not write metadata for ${id}:`, e)
  );

  // Write settings
  await writeJsonToGitHub(GH.settings(id), settings, undefined, commitMsg, token).catch((e) =>
    console.warn(`Could not write settings for ${id}:`, e)
  );

  // Write each tab's records
  for (const [tabId, records] of Object.entries(tabsRecords)) {
    await writeJsonToGitHub(GH.tab(id, tabId), records, undefined, commitMsg, token).catch((e) =>
      console.warn(`Could not write tab ${tabId} for ${id}:`, e)
    );
  }

  // Write legacy backlinks.json (backwards compat)
  const activeRecords = tabsRecords[metadata.activeSheetId || "tab_main"] || [];
  await writeJsonToGitHub(GH.backlinks(id), activeRecords, undefined, commitMsg, token).catch(
    () => {}
  );
}

// ─── Local: create all files for a new spreadsheet ───────────────────────────
function localCreateSpreadsheetFiles(
  metadata: SpreadsheetMetadata,
  tabsRecords: Record<string, BacklinkRecord[]>,
  settings: SpreadsheetSettings
) {
  const sheetDir = path.join(SPREADSHEETS_DIR, metadata.id);
  const tabsDir = path.join(sheetDir, "tabs");
  ensureDir(sheetDir);
  ensureDir(tabsDir);

  localWriteJson(path.join(sheetDir, "metadata.json"), metadata);
  localWriteJson(path.join(sheetDir, "settings.json"), settings);

  const activeRecords = tabsRecords[metadata.activeSheetId || "tab_main"] || [];
  localWriteJson(path.join(sheetDir, "backlinks.json"), activeRecords);

  for (const [tabId, records] of Object.entries(tabsRecords)) {
    localWriteJson(path.join(tabsDir, `${tabId}.json`), records);
  }
}

// ─── listSpreadsheets ─────────────────────────────────────────────────────────
export async function listSpreadsheets(
  params?: {
    workspaceId?: string;
    starred?: boolean;
    archived?: boolean;
    search?: string;
    sortBy?: "updatedAt" | "createdAt" | "title";
  },
  customToken?: string
): Promise<SpreadsheetMetadata[]> {
  const token = getToken(customToken);
  await ensureInitialMigration(customToken);

  let allMeta: SpreadsheetMetadata[] = [];

  if (isVercelProduction() || token) {
    if (!token) return [];
    // List from GitHub
    const dirs = await listDirectoryFromGitHub(GH.spreadsheetsDir(), token);
    for (const dir of dirs) {
      if (dir.type !== "dir") continue;
      try {
        const meta = await ghNormalizeMetadata(dir.name, token);
        allMeta.push(meta);
      } catch (e) {
        console.warn(`listSpreadsheets: could not load ${dir.name}:`, e);
      }
    }
  } else {
    // Local filesystem
    if (!localExists(SPREADSHEETS_DIR)) return [];
    const entries = fs.readdirSync(SPREADSHEETS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        allMeta.push(localNormalizeMetadata(entry.name));
      } catch (e) {
        console.warn(`listSpreadsheets: could not load ${entry.name}:`, e);
      }
    }
  }

  // Apply filters
  let results = allMeta.filter((meta) => {
    if (params?.workspaceId && params.workspaceId !== "all" && meta.workspaceId !== params.workspaceId) return false;
    if (params?.archived !== undefined) {
      if (Boolean(meta.isArchived) !== params.archived) return false;
    } else {
      if (meta.isArchived) return false;
    }
    if (params?.starred && !meta.isStarred) return false;
    if (params?.search?.trim()) {
      const q = params.search.toLowerCase().trim();
      const matchesTitle = meta.title.toLowerCase().includes(q);
      const matchesDesc = meta.description?.toLowerCase().includes(q) || false;
      const matchesOwner = meta.owner.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDesc && !matchesOwner) return false;
    }
    return true;
  });

  const sortBy = params?.sortBy || "updatedAt";
  results.sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return results;
}

// ─── getSpreadsheet ───────────────────────────────────────────────────────────
export async function getSpreadsheet(
  id: string,
  customToken?: string,
  targetTabId?: string
): Promise<SpreadsheetFullData> {
  const token = getToken(customToken);
  await ensureInitialMigration(customToken);

  if (isVercelProduction() || token) {
    if (!token) {
      throw new Error("GITHUB_TOKEN is required. Add it in Vercel Project Settings → Environment Variables.");
    }
    return ghGetSpreadsheet(id, token, targetTabId);
  }

  return localGetSpreadsheet(id, targetTabId);
}

async function ghGetSpreadsheet(id: string, token: string, targetTabId?: string): Promise<SpreadsheetFullData> {
  const metadata = await ghNormalizeMetadata(id, token);
  const activeTabId = targetTabId || metadata.activeSheetId || metadata.sheets[0]?.id || "tab_main";

  // Read records for the active tab
  let records: BacklinkRecord[] = [];
  let sha = "";
  const tabResult = await ghReadTabRecords(id, activeTabId, token);
  if (tabResult) {
    records = tabResult.data;
    sha = tabResult.sha;
  } else {
    // Fallback: try backlinks.json (legacy)
    const legacyResult = await readBacklinksFromGitHub(GH.backlinks(id), token);
    records = legacyResult.data;
    sha = legacyResult.sha;
  }

  const settings = await ghReadSettings(id, token) || { autoExtractDomain: true };

  return { metadata, records, settings, activeSheetId: activeTabId, sha, source: "github" };
}

function localGetSpreadsheet(id: string, targetTabId?: string): SpreadsheetFullData {
  const metadata = localNormalizeMetadata(id);
  const sheetDir = path.join(SPREADSHEETS_DIR, id);
  const tabsDir = path.join(sheetDir, "tabs");
  ensureDir(tabsDir);

  const activeTabId = targetTabId || metadata.activeSheetId || metadata.sheets[0]?.id || "tab_main";
  const tabFile = path.join(tabsDir, `${activeTabId}.json`);
  const legacyFile = path.join(sheetDir, "backlinks.json");

  let records: BacklinkRecord[] = [];
  if (localExists(tabFile)) {
    records = localReadJson<BacklinkRecord[]>(tabFile) || [];
  } else if (localExists(legacyFile)) {
    records = localReadJson<BacklinkRecord[]>(legacyFile) || [];
    localWriteJson(tabFile, records);
  }

  const settings = localReadJson<SpreadsheetSettings>(path.join(sheetDir, "settings.json")) || { autoExtractDomain: true };

  return {
    metadata,
    records,
    settings,
    activeSheetId: activeTabId,
    sha: `local-${Date.now()}`,
    source: "local",
  };
}

// ─── createSpreadsheet ────────────────────────────────────────────────────────
export async function createSpreadsheet(
  input: CreateSpreadsheetInput,
  ownerInfo: { name: string; email?: string },
  customToken?: string
): Promise<SpreadsheetFullData> {
  const token = getToken(customToken);
  const id = generateSpreadsheetId();
  const now = new Date().toISOString();
  const defaultTabId = "tab_main";

  let initialRecords: BacklinkRecord[] = [];
  if (input.template === "citations") {
    initialRecords = [
      {
        ...createEmptyBacklink("yelp.com"),
        backlinkUrl: "https://yelp.com/biz/listing",
        status: "Pending",
        category: "Local Directory",
        domain: "yelp.com",
        dr: 93,
        da: 90,
        organicTraffic: 3200000,
        anchorText: input.title,
        linkType: "Dofollow",
        notes: "Local citation profile",
      },
    ];
  }

  const defaultTab: SheetTab = {
    id: defaultTabId,
    name: "Sheet 1",
    order: 0,
    recordCount: initialRecords.length,
  };

  const metadata: SpreadsheetMetadata = {
    id,
    title: input.title.trim(),
    workspaceId: input.workspaceId,
    description: input.description?.trim() || "",
    owner: ownerInfo.name,
    ownerEmail: ownerInfo.email,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    isStarred: false,
    isArchived: false,
    recordCount: initialRecords.length,
    activeSheetId: defaultTabId,
    sheets: [defaultTab],
  };

  const settings: SpreadsheetSettings = { autoExtractDomain: true };
  const tabsRecords = { [defaultTabId]: initialRecords };

  if (isVercelProduction() || token) {
    if (!token) {
      throw new Error("GITHUB_TOKEN is required to create spreadsheets on Vercel.");
    }
    await ghCreateSpreadsheetFiles(metadata, tabsRecords, settings, token);
    return {
      metadata,
      records: initialRecords,
      settings,
      activeSheetId: defaultTabId,
      sha: "",
      source: "github",
    };
  }

  localCreateSpreadsheetFiles(metadata, tabsRecords, settings);

  // Also commit to GitHub if token available in local dev
  if (token) {
    await ghCreateSpreadsheetFiles(metadata, tabsRecords, settings, token);
    return { metadata, records: initialRecords, settings, activeSheetId: defaultTabId, sha: "", source: "github" };
  }

  return {
    metadata,
    records: initialRecords,
    settings,
    activeSheetId: defaultTabId,
    sha: `local-${Date.now()}`,
    source: "local",
  };
}

// ─── saveSheetTabRecords ──────────────────────────────────────────────────────
export async function saveSheetTabRecords(
  spreadsheetId: string,
  tabId: string,
  records: BacklinkRecord[],
  baseSha?: string,
  commitMessage?: string,
  customToken?: string
): Promise<{ success: boolean; sha: string; source: "github" | "local"; message: string }> {
  const token = getToken(customToken);

  if (isVercelProduction() && !token) {
    throw new Error(
      "GITHUB_TOKEN is required to save records on Vercel. Add it in Vercel Project Settings → Environment Variables."
    );
  }

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");

    // Read current metadata from GitHub
    const metaResult = await ghReadMetadata(spreadsheetId, token);
    if (!metaResult) throw new Error(`Spreadsheet "${spreadsheetId}" not found.`);

    const metadata = applyDefaultSheets(metaResult.data);
    const tabIndex = metadata.sheets.findIndex((s) => s.id === tabId);
    if (tabIndex === -1) throw new Error(`Sheet tab "${tabId}" not found in spreadsheet "${spreadsheetId}".`);

    // Write tab records
    const tabGhPath = GH.tab(spreadsheetId, tabId);
    const defaultMsg =
      commitMessage ||
      `chore(sheet): update "${metadata.title}" [${metadata.sheets[tabIndex].name} — ${records.length} records]`;
    const writeRes = await writeBacklinksToGitHub(
      tabGhPath,
      records,
      baseSha?.startsWith("local-") ? undefined : baseSha,
      defaultMsg,
      token
    );

    // Update metadata on GitHub
    metadata.sheets[tabIndex].recordCount = records.length;
    metadata.recordCount = metadata.sheets.reduce((sum, s) => sum + s.recordCount, 0);
    metadata.updatedAt = new Date().toISOString();
    await ghWriteMetadata(spreadsheetId, metadata, token, metaResult.sha);

    // Update local cache if applicable
    if (!isVercelProduction()) {
      const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
      localWriteJson(path.join(sheetDir, "tabs", `${tabId}.json`), records);
      localWriteJson(path.join(sheetDir, "metadata.json"), metadata);
      if (metadata.activeSheetId === tabId) {
        localWriteJson(path.join(sheetDir, "backlinks.json"), records);
      }
    }

    return { success: true, sha: writeRes.sha, source: "github", message: writeRes.message };
  }

  // Local-only
  const metadata = localNormalizeMetadata(spreadsheetId);
  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  const tabsDir = path.join(sheetDir, "tabs");
  ensureDir(tabsDir);

  const tabIndex = metadata.sheets.findIndex((s) => s.id === tabId);
  if (tabIndex === -1) throw new Error(`Sheet tab "${tabId}" not found in spreadsheet "${spreadsheetId}".`);

  localWriteJson(path.join(tabsDir, `${tabId}.json`), records);
  if (metadata.activeSheetId === tabId) {
    localWriteJson(path.join(sheetDir, "backlinks.json"), records);
  }

  metadata.sheets[tabIndex].recordCount = records.length;
  metadata.recordCount = metadata.sheets.reduce((sum, s) => sum + s.recordCount, 0);
  metadata.updatedAt = new Date().toISOString();
  localWriteJson(path.join(sheetDir, "metadata.json"), metadata);

  return {
    success: true,
    sha: `local-${Date.now()}`,
    source: "local",
    message: "Saved sheet tab records to local repository cache.",
  };
}

// ─── saveSpreadsheetRecords (backwards-compat wrapper) ───────────────────────
export async function saveSpreadsheetRecords(
  spreadsheetId: string,
  records: BacklinkRecord[],
  baseSha?: string,
  commitMessage?: string,
  customToken?: string
) {
  const token = getToken(customToken);
  let activeTabId: string;

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    const meta = await ghNormalizeMetadata(spreadsheetId, token);
    activeTabId = meta.activeSheetId || meta.sheets[0]?.id || "tab_main";
  } else {
    const meta = localNormalizeMetadata(spreadsheetId);
    activeTabId = meta.activeSheetId || meta.sheets[0]?.id || "tab_main";
  }

  return saveSheetTabRecords(spreadsheetId, activeTabId, records, baseSha, commitMessage, customToken);
}

// ─── addSheetTab ──────────────────────────────────────────────────────────────
export async function addSheetTab(
  spreadsheetId: string,
  tabName?: string,
  initialRecords: BacklinkRecord[] = [],
  customToken?: string
): Promise<{ metadata: SpreadsheetMetadata; newTab: SheetTab }> {
  const token = getToken(customToken);
  const newTabId = generateSheetTabId();

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    const metaResult = await ghReadMetadata(spreadsheetId, token);
    if (!metaResult) throw new Error(`Spreadsheet "${spreadsheetId}" not found.`);
    const metadata = applyDefaultSheets(metaResult.data);

    const nextOrder = metadata.sheets.length;
    const name = tabName?.trim() || `Sheet ${metadata.sheets.length + 1}`;
    const newTab: SheetTab = { id: newTabId, name, order: nextOrder, recordCount: initialRecords.length };

    // Write new tab records
    await writeJsonToGitHub(
      GH.tab(spreadsheetId, newTabId),
      initialRecords,
      undefined,
      `feat(sheet-tab): add sheet "${name}" in "${metadata.title}"`,
      token
    );

    // Update metadata
    metadata.sheets.push(newTab);
    metadata.activeSheetId = newTabId;
    metadata.recordCount = metadata.sheets.reduce((sum, s) => sum + s.recordCount, 0);
    metadata.updatedAt = new Date().toISOString();
    await ghWriteMetadata(spreadsheetId, metadata, token, metaResult.sha);

    return { metadata, newTab };
  }

  const metadata = localNormalizeMetadata(spreadsheetId);
  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  const tabsDir = path.join(sheetDir, "tabs");
  ensureDir(tabsDir);

  const nextOrder = metadata.sheets.length;
  const name = tabName?.trim() || `Sheet ${metadata.sheets.length + 1}`;
  const newTab: SheetTab = { id: newTabId, name, order: nextOrder, recordCount: initialRecords.length };

  localWriteJson(path.join(tabsDir, `${newTabId}.json`), initialRecords);

  metadata.sheets.push(newTab);
  metadata.activeSheetId = newTabId;
  metadata.recordCount = metadata.sheets.reduce((sum, s) => sum + s.recordCount, 0);
  metadata.updatedAt = new Date().toISOString();
  localWriteJson(path.join(sheetDir, "metadata.json"), metadata);

  return { metadata, newTab };
}

// ─── renameSheetTab ───────────────────────────────────────────────────────────
export async function renameSheetTab(
  spreadsheetId: string,
  tabId: string,
  newName: string,
  customToken?: string
): Promise<SpreadsheetMetadata> {
  const token = getToken(customToken);

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    const metaResult = await ghReadMetadata(spreadsheetId, token);
    if (!metaResult) throw new Error(`Spreadsheet "${spreadsheetId}" not found.`);
    const metadata = applyDefaultSheets(metaResult.data);
    const target = metadata.sheets.find((s) => s.id === tabId);
    if (!target) throw new Error(`Sheet tab "${tabId}" not found.`);
    target.name = newName.trim();
    metadata.updatedAt = new Date().toISOString();
    await ghWriteMetadata(spreadsheetId, metadata, token, metaResult.sha);
    return metadata;
  }

  const metadata = localNormalizeMetadata(spreadsheetId);
  const target = metadata.sheets.find((s) => s.id === tabId);
  if (!target) throw new Error(`Sheet tab "${tabId}" not found.`);
  target.name = newName.trim();
  metadata.updatedAt = new Date().toISOString();
  localWriteJson(path.join(SPREADSHEETS_DIR, spreadsheetId, "metadata.json"), metadata);
  return metadata;
}

// ─── duplicateSheetTab ────────────────────────────────────────────────────────
export async function duplicateSheetTab(
  spreadsheetId: string,
  tabId: string,
  customToken?: string
): Promise<{ metadata: SpreadsheetMetadata; clonedTab: SheetTab }> {
  const token = getToken(customToken);
  let records: BacklinkRecord[] = [];
  let sourceName = "Sheet";

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    const metaResult = await ghReadMetadata(spreadsheetId, token);
    if (!metaResult) throw new Error(`Spreadsheet "${spreadsheetId}" not found.`);
    const meta = applyDefaultSheets(metaResult.data);
    const target = meta.sheets.find((s) => s.id === tabId);
    if (!target) throw new Error(`Sheet tab "${tabId}" not found.`);
    sourceName = target.name;
    const tabResult = await ghReadTabRecords(spreadsheetId, tabId, token);
    records = tabResult?.data || [];
  } else {
    const meta = localNormalizeMetadata(spreadsheetId);
    const target = meta.sheets.find((s) => s.id === tabId);
    if (!target) throw new Error(`Sheet tab "${tabId}" not found.`);
    sourceName = target.name;
    const tabFile = path.join(SPREADSHEETS_DIR, spreadsheetId, "tabs", `${tabId}.json`);
    records = localReadJson<BacklinkRecord[]>(tabFile) || [];
  }

  const result = await addSheetTab(spreadsheetId, `${sourceName} (Copy)`, records, customToken);
  return { metadata: result.metadata, clonedTab: result.newTab };
}

// ─── deleteSheetTab ───────────────────────────────────────────────────────────
export async function deleteSheetTab(
  spreadsheetId: string,
  tabId: string,
  customToken?: string
): Promise<SpreadsheetMetadata> {
  const token = getToken(customToken);

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    const metaResult = await ghReadMetadata(spreadsheetId, token);
    if (!metaResult) throw new Error(`Spreadsheet "${spreadsheetId}" not found.`);
    const metadata = applyDefaultSheets(metaResult.data);

    if (metadata.sheets.length <= 1) {
      throw new Error("Cannot delete the only sheet tab. Create a replacement sheet first.");
    }
    const index = metadata.sheets.findIndex((s) => s.id === tabId);
    if (index === -1) throw new Error(`Sheet tab "${tabId}" not found.`);

    // Delete tab file from GitHub
    await deleteFileFromGitHub(
      GH.tab(spreadsheetId, tabId),
      undefined,
      `chore(sheet-tab): delete tab "${tabId}" from "${metadata.title}"`,
      token
    );

    metadata.sheets.splice(index, 1);
    if (metadata.activeSheetId === tabId) {
      metadata.activeSheetId = metadata.sheets[Math.max(0, index - 1)].id;
    }
    metadata.sheets.forEach((s, i) => { s.order = i; });
    metadata.recordCount = metadata.sheets.reduce((sum, s) => sum + s.recordCount, 0);
    metadata.updatedAt = new Date().toISOString();
    await ghWriteMetadata(spreadsheetId, metadata, token, metaResult.sha);
    return metadata;
  }

  const metadata = localNormalizeMetadata(spreadsheetId);
  if (metadata.sheets.length <= 1) {
    throw new Error("Cannot delete the only sheet tab. Create a replacement sheet first.");
  }
  const index = metadata.sheets.findIndex((s) => s.id === tabId);
  if (index === -1) throw new Error(`Sheet tab "${tabId}" not found.`);

  const tabFile = path.join(SPREADSHEETS_DIR, spreadsheetId, "tabs", `${tabId}.json`);
  localRemove(tabFile);

  metadata.sheets.splice(index, 1);
  if (metadata.activeSheetId === tabId) {
    metadata.activeSheetId = metadata.sheets[Math.max(0, index - 1)].id;
  }
  metadata.sheets.forEach((s, i) => { s.order = i; });
  metadata.recordCount = metadata.sheets.reduce((sum, s) => sum + s.recordCount, 0);
  metadata.updatedAt = new Date().toISOString();
  localWriteJson(path.join(SPREADSHEETS_DIR, spreadsheetId, "metadata.json"), metadata);
  return metadata;
}

// ─── reorderSheetTabs ─────────────────────────────────────────────────────────
export async function reorderSheetTabs(
  spreadsheetId: string,
  tabIdsInNewOrder: string[],
  customToken?: string
): Promise<SpreadsheetMetadata> {
  const token = getToken(customToken);

  async function applyReorder(metadata: SpreadsheetMetadata): Promise<SpreadsheetMetadata> {
    const reordered: SheetTab[] = [];
    tabIdsInNewOrder.forEach((tid, idx) => {
      const found = metadata.sheets.find((s) => s.id === tid);
      if (found) reordered.push({ ...found, order: idx });
    });
    metadata.sheets.forEach((s) => {
      if (!reordered.some((r) => r.id === s.id)) reordered.push({ ...s, order: reordered.length });
    });
    metadata.sheets = reordered;
    metadata.updatedAt = new Date().toISOString();
    return metadata;
  }

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    const metaResult = await ghReadMetadata(spreadsheetId, token);
    if (!metaResult) throw new Error(`Spreadsheet "${spreadsheetId}" not found.`);
    const metadata = await applyReorder(applyDefaultSheets(metaResult.data));
    await ghWriteMetadata(spreadsheetId, metadata, token, metaResult.sha);
    return metadata;
  }

  const metadata = await applyReorder(localNormalizeMetadata(spreadsheetId));
  localWriteJson(path.join(SPREADSHEETS_DIR, spreadsheetId, "metadata.json"), metadata);
  return metadata;
}

// ─── setActiveSheetTab ────────────────────────────────────────────────────────
export async function setActiveSheetTab(
  spreadsheetId: string,
  tabId: string,
  customToken?: string
): Promise<SpreadsheetMetadata> {
  const token = getToken(customToken);

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    const metaResult = await ghReadMetadata(spreadsheetId, token);
    if (!metaResult) throw new Error(`Spreadsheet "${spreadsheetId}" not found.`);
    const metadata = applyDefaultSheets(metaResult.data);
    if (metadata.sheets.some((s) => s.id === tabId)) {
      metadata.activeSheetId = tabId;
      metadata.updatedAt = new Date().toISOString();
      await ghWriteMetadata(spreadsheetId, metadata, token, metaResult.sha);
    }
    return metadata;
  }

  const metadata = localNormalizeMetadata(spreadsheetId);
  if (metadata.sheets.some((s) => s.id === tabId)) {
    metadata.activeSheetId = tabId;
    localWriteJson(path.join(SPREADSHEETS_DIR, spreadsheetId, "metadata.json"), metadata);
  }
  return metadata;
}

// ─── exportEntireSpreadsheet ──────────────────────────────────────────────────
export async function exportEntireSpreadsheet(spreadsheetId: string, customToken?: string) {
  const token = getToken(customToken);
  let metadata: SpreadsheetMetadata;
  const sheetsData: Record<string, { tab: SheetTab; records: BacklinkRecord[] }> = {};

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    metadata = await ghNormalizeMetadata(spreadsheetId, token);
    for (const tab of metadata.sheets) {
      const result = await ghReadTabRecords(spreadsheetId, tab.id, token);
      sheetsData[tab.id] = { tab, records: result?.data || [] };
    }
  } else {
    metadata = localNormalizeMetadata(spreadsheetId);
    const tabsDir = path.join(SPREADSHEETS_DIR, spreadsheetId, "tabs");
    for (const tab of metadata.sheets) {
      const records = localReadJson<BacklinkRecord[]>(path.join(tabsDir, `${tab.id}.json`)) || [];
      sheetsData[tab.id] = { tab, records };
    }
  }

  return { metadata, sheets: sheetsData, exportedAt: new Date().toISOString() };
}

// ─── updateSpreadsheetMetadata ────────────────────────────────────────────────
export async function updateSpreadsheetMetadata(
  id: string,
  updates: Partial<SpreadsheetMetadata> & { settings?: Partial<SpreadsheetSettings> },
  customToken?: string
): Promise<SpreadsheetMetadata> {
  const token = getToken(customToken);

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    const metaResult = await ghReadMetadata(id, token);
    if (!metaResult) throw new Error(`Spreadsheet "${id}" not found.`);
    const updatedMeta: SpreadsheetMetadata = {
      ...applyDefaultSheets(metaResult.data),
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await ghWriteMetadata(id, updatedMeta, token, metaResult.sha);

    if (updates.settings) {
      const curSettings = await ghReadSettings(id, token) || { autoExtractDomain: true };
      await writeJsonToGitHub(GH.settings(id), { ...curSettings, ...updates.settings }, undefined, `chore(settings): update settings for "${updatedMeta.title}"`, token);
    }
    return updatedMeta;
  }

  const sheetDir = path.join(SPREADSHEETS_DIR, id);
  const metadata = localNormalizeMetadata(id);
  const updatedMeta: SpreadsheetMetadata = {
    ...metadata,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localWriteJson(path.join(sheetDir, "metadata.json"), updatedMeta);

  if (updates.settings) {
    const settingsFile = path.join(sheetDir, "settings.json");
    const curSettings = localReadJson<SpreadsheetSettings>(settingsFile) || { autoExtractDomain: true };
    localWriteJson(settingsFile, { ...curSettings, ...updates.settings });
  }
  return updatedMeta;
}

// ─── duplicateSpreadsheet ─────────────────────────────────────────────────────
export async function duplicateSpreadsheet(
  id: string,
  newTitle?: string,
  ownerName = "Arsal Malik",
  customToken?: string
): Promise<SpreadsheetFullData> {
  const token = getToken(customToken);
  const original = await getSpreadsheet(id, customToken);
  const newId = generateSpreadsheetId();
  const now = new Date().toISOString();

  const metadata: SpreadsheetMetadata = {
    ...original.metadata,
    id: newId,
    title: newTitle || `${original.metadata.title} (Copy)`,
    owner: ownerName,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    isStarred: false,
    isArchived: false,
  };

  const tabsRecords: Record<string, BacklinkRecord[]> = {};

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    for (const tab of original.metadata.sheets) {
      const result = await ghReadTabRecords(id, tab.id, token);
      tabsRecords[tab.id] = result?.data || [];
    }
    await ghCreateSpreadsheetFiles(metadata, tabsRecords, original.settings, token);
  } else {
    const tabsDir = path.join(SPREADSHEETS_DIR, id, "tabs");
    for (const tab of original.metadata.sheets) {
      tabsRecords[tab.id] = localReadJson<BacklinkRecord[]>(path.join(tabsDir, `${tab.id}.json`)) || [];
    }
    localCreateSpreadsheetFiles(metadata, tabsRecords, original.settings);
  }

  const activeRecords = tabsRecords[metadata.activeSheetId || "tab_main"] || [];
  return {
    metadata,
    records: activeRecords,
    settings: original.settings,
    activeSheetId: metadata.activeSheetId || "tab_main",
    sha: `local-${Date.now()}`,
    source: token ? "github" : "local",
  };
}

// ─── deleteSpreadsheet ────────────────────────────────────────────────────────
export async function deleteSpreadsheet(id: string, customToken?: string): Promise<boolean> {
  const token = getToken(customToken);

  if (isVercelProduction() || token) {
    if (!token) throw new Error("GITHUB_TOKEN is required.");
    // Delete metadata, settings, backlinks, and all tab files via GitHub
    const metaResult = await ghReadMetadata(id, token);
    if (!metaResult) throw new Error(`Spreadsheet "${id}" not found.`);
    const metadata = applyDefaultSheets(metaResult.data);

    // Delete each tab file
    for (const tab of metadata.sheets) {
      await deleteFileFromGitHub(GH.tab(id, tab.id), undefined, `chore(spreadsheet): delete "${metadata.title}" [${id}]`, token).catch(() => {});
    }
    // Delete core files
    for (const ghPath of [GH.backlinks(id), GH.settings(id), GH.metadata(id)]) {
      await deleteFileFromGitHub(ghPath, undefined, `chore(spreadsheet): delete "${metadata.title}" [${id}]`, token).catch(() => {});
    }
    return true;
  }

  const sheetDir = path.join(SPREADSHEETS_DIR, id);
  if (!localExists(sheetDir)) throw new Error(`Spreadsheet "${id}" not found.`);
  localRemoveDir(sheetDir);
  return true;
}

// ─── recordSpreadsheetOpened ──────────────────────────────────────────────────
export function recordSpreadsheetOpened(id: string, customToken?: string) {
  // Fire-and-forget; only update local cache in development to avoid slowing navigation
  if (!isVercelProduction()) {
    const metaFile = path.join(SPREADSHEETS_DIR, id, "metadata.json");
    if (localExists(metaFile)) {
      try {
        const meta = localReadJson<SpreadsheetMetadata>(metaFile);
        if (meta) {
          meta.lastOpenedAt = new Date().toISOString();
          localWriteJson(metaFile, meta);
        }
      } catch {}
    }
  }
  // On Vercel, we skip this since it would be a GitHub commit on every page open — too expensive
}
