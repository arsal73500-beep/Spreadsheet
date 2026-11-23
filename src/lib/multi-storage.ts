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
  getGitHubConfig,
  getOctokitClient,
} from "./github";

const DATA_DIR = path.join(process.cwd(), "data");
const SPREADSHEETS_DIR = path.join(DATA_DIR, "spreadsheets");
const WORKSPACES_DIR = path.join(DATA_DIR, "workspaces");

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Migrate legacy client files into data/spreadsheets/[id] if not already present
 */
export function ensureInitialMigration() {
  ensureDir(SPREADSHEETS_DIR);
  ensureDir(WORKSPACES_DIR);

  const wsFile = path.join(WORKSPACES_DIR, "workspaces.json");
  if (!fs.existsSync(wsFile)) {
    fs.writeFileSync(wsFile, JSON.stringify(WORKSPACES, null, 2), "utf-8");
  }

  const existingDirs = fs
    .readdirSync(SPREADSHEETS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  if (existingDirs.length > 0) {
    // Ensure all existing sheets have the `sheets` array in metadata
    for (const dir of existingDirs) {
      normalizeSpreadsheetMetadata(dir.name);
    }
    return;
  }

  // 1. Migrate MD Health Center
  const legacyMd = path.join(DATA_DIR, "md-health-center", "backlinks.json");
  let mdRecords: BacklinkRecord[] = [];
  if (fs.existsSync(legacyMd)) {
    try {
      mdRecords = JSON.parse(fs.readFileSync(legacyMd, "utf-8"));
    } catch {}
  }
  createSpreadsheetInternal(
    {
      id: "sheet_md_backlinks_01",
      title: "MD Health Center — Backlink Tracker",
      workspaceId: "md-health-center",
      description: "Primary backlink tracker for clinical diagnostic and health awareness",
      owner: "Arsal Malik",
      ownerEmail: "arsal73500@gmail.com",
      createdAt: "2026-10-15T09:00:00.000Z",
      updatedAt: new Date().toISOString(),
      isStarred: true,
      isArchived: false,
      recordCount: mdRecords.length,
      activeSheetId: "tab_main",
      sheets: [
        { id: "tab_main", name: "Live Backlinks", order: 0, recordCount: mdRecords.length },
        { id: "tab_guest_posts", name: "Guest Posts Pipeline", order: 1, recordCount: 1 },
      ],
    },
    {
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
    }
  );

  // MD Health Center secondary sheet: Local Citations
  createSpreadsheetInternal(
    {
      id: "sheet_md_citations_02",
      title: "MD Health Center — Local Citations",
      workspaceId: "md-health-center",
      description: "Local clinic map packs, NAP consistency and healthcare directories",
      owner: "Arsal Malik",
      ownerEmail: "arsal73500@gmail.com",
      createdAt: "2026-11-01T10:30:00.000Z",
      updatedAt: new Date().toISOString(),
      isStarred: false,
      isArchived: false,
      recordCount: 2,
      activeSheetId: "tab_main",
      sheets: [{ id: "tab_main", name: "Sheet 1", order: 0, recordCount: 2 }],
    },
    {
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
    }
  );

  // 2. AINT Foundation
  const legacyAint = path.join(DATA_DIR, "aint-foundation", "backlinks.json");
  let aintRecords: BacklinkRecord[] = [];
  if (fs.existsSync(legacyAint)) {
    try {
      aintRecords = JSON.parse(fs.readFileSync(legacyAint, "utf-8"));
    } catch {}
  }
  createSpreadsheetInternal(
    {
      id: "sheet_aint_backlinks_01",
      title: "AINT Foundation — Backlink Tracker",
      workspaceId: "aint-foundation",
      description: "UK Community Interest Company (CIC) backlink campaign",
      owner: "Arsal Malik",
      ownerEmail: "arsal73500@gmail.com",
      createdAt: "2026-10-10T08:00:00.000Z",
      updatedAt: new Date().toISOString(),
      isStarred: true,
      isArchived: false,
      recordCount: aintRecords.length,
      activeSheetId: "tab_main",
      sheets: [{ id: "tab_main", name: "Sheet 1", order: 0, recordCount: aintRecords.length }],
    },
    { tab_main: aintRecords }
  );

  // 3. Dr Irshad Malik
  const legacyDr = path.join(DATA_DIR, "dr-irshad-malik", "backlinks.json");
  let drRecords: BacklinkRecord[] = [];
  if (fs.existsSync(legacyDr)) {
    try {
      drRecords = JSON.parse(fs.readFileSync(legacyDr, "utf-8"));
    } catch {}
  }
  createSpreadsheetInternal(
    {
      id: "sheet_dr_backlinks_01",
      title: "Dr. Irshad Malik — Backlink Tracker",
      workspaceId: "dr-irshad-malik",
      description: "ENT surgeon authority profiles, medical directories and guest articles",
      owner: "Arsal Malik",
      ownerEmail: "arsal73500@gmail.com",
      createdAt: "2026-09-15T09:00:00.000Z",
      updatedAt: new Date().toISOString(),
      isStarred: true,
      isArchived: false,
      recordCount: drRecords.length,
      activeSheetId: "tab_main",
      sheets: [{ id: "tab_main", name: "Sheet 1", order: 0, recordCount: drRecords.length }],
    },
    { tab_main: drRecords }
  );

  // 4. General Spreadsheet
  createSpreadsheetInternal(
    {
      id: "sheet_general_01",
      title: "General SEO Outreach & Link Opportunities",
      workspaceId: "general",
      description: "Universal backlinks and prospect websites to evaluate",
      owner: "Arsal Malik",
      ownerEmail: "arsal73500@gmail.com",
      createdAt: "2026-11-20T11:00:00.000Z",
      updatedAt: new Date().toISOString(),
      isStarred: false,
      isArchived: false,
      recordCount: 1,
      activeSheetId: "tab_main",
      sheets: [{ id: "tab_main", name: "Sheet 1", order: 0, recordCount: 1 }],
    },
    {
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
    }
  );
}

/**
 * Ensure spreadsheet metadata has `sheets` array & `activeSheetId`
 */
function normalizeSpreadsheetMetadata(spreadsheetId: string): SpreadsheetMetadata {
  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  const metaFile = path.join(sheetDir, "metadata.json");
  if (!fs.existsSync(metaFile)) {
    throw new Error(`Spreadsheet "${spreadsheetId}" metadata not found.`);
  }

  const meta: SpreadsheetMetadata = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
  let modified = false;

  if (!Array.isArray(meta.sheets) || meta.sheets.length === 0) {
    const tabsDir = path.join(sheetDir, "tabs");
    ensureDir(tabsDir);

    let defaultRecords: BacklinkRecord[] = [];
    const rootRecords = path.join(sheetDir, "backlinks.json");
    if (fs.existsSync(rootRecords)) {
      try {
        defaultRecords = JSON.parse(fs.readFileSync(rootRecords, "utf-8"));
      } catch {}
    }

    const tabMainPath = path.join(tabsDir, "tab_main.json");
    if (!fs.existsSync(tabMainPath)) {
      fs.writeFileSync(tabMainPath, JSON.stringify(defaultRecords, null, 2), "utf-8");
    }

    meta.sheets = [
      {
        id: "tab_main",
        name: "Sheet 1",
        order: 0,
        recordCount: defaultRecords.length,
      },
    ];
    meta.activeSheetId = "tab_main";
    modified = true;
  }

  if (!meta.activeSheetId && meta.sheets.length > 0) {
    meta.activeSheetId = meta.sheets[0].id;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), "utf-8");
  }

  return meta;
}

function createSpreadsheetInternal(
  metadata: SpreadsheetMetadata,
  tabsRecords: Record<string, BacklinkRecord[]> = {},
  settings: SpreadsheetSettings = { autoExtractDomain: true }
) {
  const sheetDir = path.join(SPREADSHEETS_DIR, metadata.id);
  const tabsDir = path.join(sheetDir, "tabs");
  ensureDir(sheetDir);
  ensureDir(tabsDir);

  fs.writeFileSync(
    path.join(sheetDir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(sheetDir, "settings.json"),
    JSON.stringify(settings, null, 2),
    "utf-8"
  );

  // Write tabs records and backwards-compatible backlinks.json
  const defaultTabRecords = tabsRecords[metadata.activeSheetId || "tab_main"] || [];
  fs.writeFileSync(
    path.join(sheetDir, "backlinks.json"),
    JSON.stringify(defaultTabRecords, null, 2),
    "utf-8"
  );

  for (const [tabId, records] of Object.entries(tabsRecords)) {
    fs.writeFileSync(
      path.join(tabsDir, `${tabId}.json`),
      JSON.stringify(records, null, 2),
      "utf-8"
    );
  }
}

/**
 * List all spreadsheets
 */
export async function listSpreadsheets(params?: {
  workspaceId?: string;
  starred?: boolean;
  archived?: boolean;
  search?: string;
  sortBy?: "updatedAt" | "createdAt" | "title";
}): Promise<SpreadsheetMetadata[]> {
  ensureInitialMigration();

  const entries = fs.readdirSync(SPREADSHEETS_DIR, { withFileTypes: true });
  const results: SpreadsheetMetadata[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const meta = normalizeSpreadsheetMetadata(entry.name);

      if (params?.workspaceId && params.workspaceId !== "all" && meta.workspaceId !== params.workspaceId) {
        continue;
      }
      if (params?.archived !== undefined) {
        if (Boolean(meta.isArchived) !== params.archived) continue;
      } else {
        if (meta.isArchived) continue;
      }
      if (params?.starred && !meta.isStarred) continue;
      if (params?.search?.trim()) {
        const q = params.search.toLowerCase().trim();
        const matchesTitle = meta.title.toLowerCase().includes(q);
        const matchesDesc = meta.description?.toLowerCase().includes(q) || false;
        const matchesOwner = meta.owner.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesOwner) continue;
      }

      results.push(meta);
    } catch (e) {
      console.warn(`Failed reading metadata for ${entry.name}:`, e);
    }
  }

  const sortBy = params?.sortBy || "updatedAt";
  results.sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return results;
}

/**
 * Get spreadsheet full data (metadata, records for active sheet tab, settings)
 */
export async function getSpreadsheet(
  id: string,
  customToken?: string,
  targetTabId?: string
): Promise<SpreadsheetFullData> {
  ensureInitialMigration();
  const metadata = normalizeSpreadsheetMetadata(id);

  const sheetDir = path.join(SPREADSHEETS_DIR, id);
  const tabsDir = path.join(sheetDir, "tabs");
  ensureDir(tabsDir);

  const activeTabId = targetTabId || metadata.activeSheetId || metadata.sheets[0]?.id || "tab_main";
  const tabFile = path.join(tabsDir, `${activeTabId}.json`);
  const legacyFile = path.join(sheetDir, "backlinks.json");

  let records: BacklinkRecord[] = [];
  if (fs.existsSync(tabFile)) {
    try {
      records = JSON.parse(fs.readFileSync(tabFile, "utf-8"));
    } catch {}
  } else if (fs.existsSync(legacyFile)) {
    try {
      records = JSON.parse(fs.readFileSync(legacyFile, "utf-8"));
      fs.writeFileSync(tabFile, JSON.stringify(records, null, 2), "utf-8");
    } catch {}
  }

  let settings: SpreadsheetSettings = { autoExtractDomain: true };
  const settingsFile = path.join(sheetDir, "settings.json");
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
    } catch {}
  }

  // Check GitHub if token configured
  const tokenToUse = customToken || getGitHubConfig().token;
  if (tokenToUse) {
    try {
      const ghPath = `data/spreadsheets/${id}/tabs/${activeTabId}.json`;
      const ghResult = await readBacklinksFromGitHub(ghPath, tokenToUse);
      if (ghResult.data && Array.isArray(ghResult.data)) {
        records = ghResult.data;
        return {
          metadata,
          records,
          settings,
          activeSheetId: activeTabId,
          sha: ghResult.sha,
          source: "github",
        };
      }
    } catch (e) {
      // Local fallback
    }
  }

  return {
    metadata,
    records,
    settings,
    activeSheetId: activeTabId,
    sha: `local-${Date.now()}`,
    source: "local",
  };
}

/**
 * Create a new spreadsheet
 */
export async function createSpreadsheet(
  input: CreateSpreadsheetInput,
  ownerInfo: { name: string; email?: string },
  customToken?: string
): Promise<SpreadsheetFullData> {
  ensureInitialMigration();

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

  const settings: SpreadsheetSettings = {
    autoExtractDomain: true,
  };

  createSpreadsheetInternal(metadata, { [defaultTabId]: initialRecords }, settings);

  const tokenToUse = customToken || getGitHubConfig().token;
  let sha = `local-${Date.now()}`;
  let source: "github" | "local" = "local";

  if (tokenToUse) {
    try {
      const commitMsg = `feat(spreadsheet): create spreadsheet "${metadata.title}" [${metadata.id}]`;
      const res = await writeBacklinksToGitHub(
        `data/spreadsheets/${id}/tabs/${defaultTabId}.json`,
        initialRecords,
        undefined,
        commitMsg,
        tokenToUse
      );
      sha = res.sha;
      source = "github";
    } catch (e) {
      console.warn("GitHub commit on create failed, saved locally:", e);
    }
  }

  return {
    metadata,
    records: initialRecords,
    settings,
    activeSheetId: defaultTabId,
    sha,
    source,
  };
}

/**
 * Save records for a specific sheet tab inside a spreadsheet
 */
export async function saveSheetTabRecords(
  spreadsheetId: string,
  tabId: string,
  records: BacklinkRecord[],
  baseSha?: string,
  commitMessage?: string,
  customToken?: string
): Promise<{ success: boolean; sha: string; source: "github" | "local"; message: string }> {
  const metadata = normalizeSpreadsheetMetadata(spreadsheetId);
  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  const tabsDir = path.join(sheetDir, "tabs");
  ensureDir(tabsDir);

  const tabIndex = metadata.sheets.findIndex((s) => s.id === tabId);
  if (tabIndex === -1) {
    throw new Error(`Sheet tab "${tabId}" not found in spreadsheet "${spreadsheetId}".`);
  }

  // 1. Write tab records
  const tabFile = path.join(tabsDir, `${tabId}.json`);
  fs.writeFileSync(tabFile, JSON.stringify(records, null, 2), "utf-8");

  // Also sync to backlinks.json if active sheet for backwards compatibility
  if (metadata.activeSheetId === tabId) {
    fs.writeFileSync(path.join(sheetDir, "backlinks.json"), JSON.stringify(records, null, 2), "utf-8");
  }

  // 2. Update metadata tab count & overall count
  metadata.sheets[tabIndex].recordCount = records.length;
  metadata.recordCount = metadata.sheets.reduce((sum, s) => sum + s.recordCount, 0);
  metadata.updatedAt = new Date().toISOString();

  const metaFile = path.join(sheetDir, "metadata.json");
  fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2), "utf-8");

  // 3. GitHub Commit
  const tokenToUse = customToken || getGitHubConfig().token;
  if (tokenToUse) {
    const ghPath = `data/spreadsheets/${spreadsheetId}/tabs/${tabId}.json`;
    const defaultMsg =
      commitMessage ||
      `chore(sheet): update "${metadata.title}" [${metadata.sheets[tabIndex].name} - ${records.length} records]`;

    const writeRes = await writeBacklinksToGitHub(
      ghPath,
      records,
      baseSha?.startsWith("local-") ? undefined : baseSha,
      defaultMsg,
      tokenToUse
    );

    return {
      success: true,
      sha: writeRes.sha,
      source: "github",
      message: writeRes.message,
    };
  }

  return {
    success: true,
    sha: `local-${Date.now()}`,
    source: "local",
    message: "Saved sheet tab records to local repository cache.",
  };
}

/**
 * Add a new sheet tab to a spreadsheet
 */
export async function addSheetTab(
  spreadsheetId: string,
  tabName?: string,
  initialRecords: BacklinkRecord[] = [],
  customToken?: string
): Promise<{ metadata: SpreadsheetMetadata; newTab: SheetTab }> {
  const metadata = normalizeSpreadsheetMetadata(spreadsheetId);
  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  const tabsDir = path.join(sheetDir, "tabs");
  ensureDir(tabsDir);

  const newTabId = generateSheetTabId();
  const nextOrder = metadata.sheets.length;
  const name = tabName?.trim() || `Sheet ${metadata.sheets.length + 1}`;

  const newTab: SheetTab = {
    id: newTabId,
    name,
    order: nextOrder,
    recordCount: initialRecords.length,
  };

  // Write tab records
  fs.writeFileSync(
    path.join(tabsDir, `${newTabId}.json`),
    JSON.stringify(initialRecords, null, 2),
    "utf-8"
  );

  // Update metadata
  metadata.sheets.push(newTab);
  metadata.activeSheetId = newTabId;
  metadata.recordCount = metadata.sheets.reduce((sum, s) => sum + s.recordCount, 0);
  metadata.updatedAt = new Date().toISOString();

  fs.writeFileSync(path.join(sheetDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  // GitHub commit
  const tokenToUse = customToken || getGitHubConfig().token;
  if (tokenToUse) {
    try {
      await writeBacklinksToGitHub(
        `data/spreadsheets/${spreadsheetId}/tabs/${newTabId}.json`,
        initialRecords,
        undefined,
        `feat(sheet-tab): add sheet "${name}" in "${metadata.title}"`,
        tokenToUse
      );
    } catch (e) {
      console.warn("GitHub commit for new sheet tab failed:", e);
    }
  }

  return { metadata, newTab };
}

/**
 * Rename a sheet tab
 */
export async function renameSheetTab(
  spreadsheetId: string,
  tabId: string,
  newName: string,
  customToken?: string
): Promise<SpreadsheetMetadata> {
  const metadata = normalizeSpreadsheetMetadata(spreadsheetId);
  const target = metadata.sheets.find((s) => s.id === tabId);
  if (!target) {
    throw new Error(`Sheet tab "${tabId}" not found.`);
  }

  target.name = newName.trim();
  metadata.updatedAt = new Date().toISOString();

  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  fs.writeFileSync(path.join(sheetDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  return metadata;
}

/**
 * Duplicate a sheet tab (clones tab and its records)
 */
export async function duplicateSheetTab(
  spreadsheetId: string,
  tabId: string,
  customToken?: string
): Promise<{ metadata: SpreadsheetMetadata; clonedTab: SheetTab }> {
  const metadata = normalizeSpreadsheetMetadata(spreadsheetId);
  const target = metadata.sheets.find((s) => s.id === tabId);
  if (!target) {
    throw new Error(`Sheet tab "${tabId}" not found.`);
  }

  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  const tabsDir = path.join(sheetDir, "tabs");
  const tabFile = path.join(tabsDir, `${tabId}.json`);

  let records: BacklinkRecord[] = [];
  if (fs.existsSync(tabFile)) {
    try {
      records = JSON.parse(fs.readFileSync(tabFile, "utf-8"));
    } catch {}
  }

  return addSheetTab(
    spreadsheetId,
    `${target.name} (Copy)`,
    records,
    customToken
  );
}

/**
 * Delete a sheet tab with protection against deleting the last remaining sheet
 */
export async function deleteSheetTab(
  spreadsheetId: string,
  tabId: string,
  customToken?: string
): Promise<SpreadsheetMetadata> {
  const metadata = normalizeSpreadsheetMetadata(spreadsheetId);

  if (metadata.sheets.length <= 1) {
    throw new Error("Cannot delete the only sheet tab in the spreadsheet. Create a replacement sheet first.");
  }

  const index = metadata.sheets.findIndex((s) => s.id === tabId);
  if (index === -1) {
    throw new Error(`Sheet tab "${tabId}" not found.`);
  }

  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  const tabsDir = path.join(sheetDir, "tabs");
  const tabFile = path.join(tabsDir, `${tabId}.json`);

  // Remove file
  if (fs.existsSync(tabFile)) {
    fs.rmSync(tabFile, { force: true });
  }

  // Remove from metadata
  metadata.sheets.splice(index, 1);

  // If deleted active tab, activate nearest tab
  if (metadata.activeSheetId === tabId) {
    metadata.activeSheetId = metadata.sheets[Math.max(0, index - 1)].id;
  }

  // Normalize order
  metadata.sheets.forEach((s, i) => {
    s.order = i;
  });

  metadata.recordCount = metadata.sheets.reduce((sum, s) => sum + s.recordCount, 0);
  metadata.updatedAt = new Date().toISOString();

  fs.writeFileSync(path.join(sheetDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  return metadata;
}

/**
 * Reorder sheet tabs using new order array of tab IDs
 */
export async function reorderSheetTabs(
  spreadsheetId: string,
  tabIdsInNewOrder: string[],
  customToken?: string
): Promise<SpreadsheetMetadata> {
  const metadata = normalizeSpreadsheetMetadata(spreadsheetId);

  const reordered: SheetTab[] = [];
  tabIdsInNewOrder.forEach((tid, idx) => {
    const found = metadata.sheets.find((s) => s.id === tid);
    if (found) {
      reordered.push({ ...found, order: idx });
    }
  });

  // Add any missing
  metadata.sheets.forEach((s) => {
    if (!reordered.some((r) => r.id === s.id)) {
      reordered.push({ ...s, order: reordered.length });
    }
  });

  metadata.sheets = reordered;
  metadata.updatedAt = new Date().toISOString();

  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  fs.writeFileSync(path.join(sheetDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  return metadata;
}

/**
 * Set active sheet tab
 */
export async function setActiveSheetTab(spreadsheetId: string, tabId: string): Promise<SpreadsheetMetadata> {
  const metadata = normalizeSpreadsheetMetadata(spreadsheetId);
  if (metadata.sheets.some((s) => s.id === tabId)) {
    metadata.activeSheetId = tabId;
    const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
    fs.writeFileSync(path.join(sheetDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");
  }
  return metadata;
}

/**
 * Export entire spreadsheet (all sheets + metadata + records)
 */
export async function exportEntireSpreadsheet(spreadsheetId: string) {
  const metadata = normalizeSpreadsheetMetadata(spreadsheetId);
  const sheetDir = path.join(SPREADSHEETS_DIR, spreadsheetId);
  const tabsDir = path.join(sheetDir, "tabs");

  const sheetsData: Record<string, { tab: SheetTab; records: BacklinkRecord[] }> = {};

  for (const tab of metadata.sheets) {
    const tabFile = path.join(tabsDir, `${tab.id}.json`);
    let recs: BacklinkRecord[] = [];
    if (fs.existsSync(tabFile)) {
      try {
        recs = JSON.parse(fs.readFileSync(tabFile, "utf-8"));
      } catch {}
    }
    sheetsData[tab.id] = { tab, records: recs };
  }

  return {
    metadata,
    sheets: sheetsData,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Update spreadsheet metadata
 */
export async function updateSpreadsheetMetadata(
  id: string,
  updates: Partial<SpreadsheetMetadata> & { settings?: Partial<SpreadsheetSettings> },
  customToken?: string
): Promise<SpreadsheetMetadata> {
  const metadata = normalizeSpreadsheetMetadata(id);
  const sheetDir = path.join(SPREADSHEETS_DIR, id);

  const updatedMeta: SpreadsheetMetadata = {
    ...metadata,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(sheetDir, "metadata.json"), JSON.stringify(updatedMeta, null, 2), "utf-8");

  if (updates.settings) {
    const settingsFile = path.join(sheetDir, "settings.json");
    let curSettings: SpreadsheetSettings = { autoExtractDomain: true };
    if (fs.existsSync(settingsFile)) {
      try {
        curSettings = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
      } catch {}
    }
    const mergedSettings = { ...curSettings, ...updates.settings };
    fs.writeFileSync(settingsFile, JSON.stringify(mergedSettings, null, 2), "utf-8");
  }

  return updatedMeta;
}

/**
 * Duplicate a spreadsheet
 */
export async function duplicateSpreadsheet(
  id: string,
  newTitle?: string,
  ownerName = "Arsal Malik",
  customToken?: string
): Promise<SpreadsheetFullData> {
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
  const sheetDir = path.join(SPREADSHEETS_DIR, id);
  const tabsDir = path.join(sheetDir, "tabs");

  for (const tab of original.metadata.sheets) {
    const tabFile = path.join(tabsDir, `${tab.id}.json`);
    let recs: BacklinkRecord[] = [];
    if (fs.existsSync(tabFile)) {
      try {
        recs = JSON.parse(fs.readFileSync(tabFile, "utf-8"));
      } catch {}
    }
    tabsRecords[tab.id] = recs;
  }

  createSpreadsheetInternal(metadata, tabsRecords, original.settings);

  return {
    metadata,
    records: tabsRecords[metadata.activeSheetId || "tab_main"] || [],
    settings: original.settings,
    activeSheetId: metadata.activeSheetId || "tab_main",
    sha: `local-${Date.now()}`,
    source: "local",
  };
}

/**
 * Permanently delete a spreadsheet
 */
export async function deleteSpreadsheet(id: string, customToken?: string): Promise<boolean> {
  const sheetDir = path.join(SPREADSHEETS_DIR, id);
  if (!fs.existsSync(sheetDir)) {
    throw new Error(`Spreadsheet "${id}" not found.`);
  }

  fs.rmSync(sheetDir, { recursive: true, force: true });
  return true;
}

/**
 * Record spreadsheet opened timestamp
 */
export function recordSpreadsheetOpened(id: string) {
  const metaFile = path.join(SPREADSHEETS_DIR, id, "metadata.json");
  if (fs.existsSync(metaFile)) {
    try {
      const meta: SpreadsheetMetadata = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
      meta.lastOpenedAt = new Date().toISOString();
      fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), "utf-8");
    } catch {}
  }
}
