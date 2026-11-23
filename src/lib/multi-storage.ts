import fs from "fs";
import path from "path";
import {
  SpreadsheetMetadata,
  SpreadsheetSettings,
  SpreadsheetFullData,
  CreateSpreadsheetInput,
  generateSpreadsheetId,
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

  // Write workspaces.json if not present
  const wsFile = path.join(WORKSPACES_DIR, "workspaces.json");
  if (!fs.existsSync(wsFile)) {
    fs.writeFileSync(wsFile, JSON.stringify(WORKSPACES, null, 2), "utf-8");
  }

  // Check if any spreadsheets exist
  const existingDirs = fs
    .readdirSync(SPREADSHEETS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  if (existingDirs.length > 0) {
    return; // Already initialized
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
    },
    mdRecords
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
    },
    [
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
    ]
  );

  // 2. Migrate AINT Foundation
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
    },
    aintRecords
  );

  // AINT Foundation secondary sheet: Mental Health Directories
  createSpreadsheetInternal(
    {
      id: "sheet_aint_mental_02",
      title: "AINT Foundation — Mental Health Directories",
      workspaceId: "aint-foundation",
      description: "UK charity and mental health outreach community citations",
      owner: "SEO Team Editor",
      ownerEmail: "seo-team@backlinkmanager.internal",
      createdAt: "2026-11-05T12:00:00.000Z",
      updatedAt: new Date().toISOString(),
      isStarred: false,
      isArchived: false,
      recordCount: 1,
    },
    [
      {
        ...createEmptyBacklink("mind.org.uk"),
        id: "bl_aint_m_01",
        backlinkUrl: "https://mind.org.uk/community-partners/aint-cic",
        status: "Submitted",
        category: "Organization Profile",
        domain: "mind.org.uk",
        dr: 81,
        da: 76,
        organicTraffic: 350000,
        anchorText: "AINT Foundation CIC Outreach",
        linkType: "Dofollow",
        notes: "Partner resource listing under evaluation",
      },
    ]
  );

  // 3. Migrate Dr Irshad Malik
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
    },
    drRecords
  );

  // Dr Irshad Malik secondary sheet: Healthcare Outreach
  createSpreadsheetInternal(
    {
      id: "sheet_dr_outreach_02",
      title: "Dr. Irshad Malik — Healthcare Outreach",
      workspaceId: "dr-irshad-malik",
      description: "Podcast appearances, ENT surgical Q&A forums and journals",
      owner: "Arsal Malik",
      ownerEmail: "arsal73500@gmail.com",
      createdAt: "2026-11-12T14:00:00.000Z",
      updatedAt: new Date().toISOString(),
      isStarred: false,
      isArchived: false,
      recordCount: 1,
    },
    [
      {
        ...createEmptyBacklink("entnet.org"),
        id: "bl_dr_out_01",
        backlinkUrl: "https://entnet.org/clinical-directory/dr-irshad-malik",
        status: "Live",
        category: "Business Profile",
        domain: "entnet.org",
        dr: 79,
        da: 74,
        organicTraffic: 210000,
        anchorText: "Dr. Irshad Malik ENT Clinical Consultant",
        linkType: "Dofollow",
        notes: "Global Otolaryngology association directory",
      },
    ]
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
    },
    [
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
    ]
  );
}

function createSpreadsheetInternal(
  metadata: SpreadsheetMetadata,
  records: BacklinkRecord[] = [],
  settings: SpreadsheetSettings = { autoExtractDomain: true }
) {
  const sheetDir = path.join(SPREADSHEETS_DIR, metadata.id);
  ensureDir(sheetDir);
  fs.writeFileSync(
    path.join(sheetDir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(sheetDir, "backlinks.json"),
    JSON.stringify(records, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(sheetDir, "settings.json"),
    JSON.stringify(settings, null, 2),
    "utf-8"
  );
}

/**
 * List all spreadsheets with optional filtering
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
    const metaFile = path.join(SPREADSHEETS_DIR, entry.name, "metadata.json");
    if (!fs.existsSync(metaFile)) continue;

    try {
      const raw = fs.readFileSync(metaFile, "utf-8");
      const meta: SpreadsheetMetadata = JSON.parse(raw);

      // Filter by workspace
      if (params?.workspaceId && params.workspaceId !== "all" && meta.workspaceId !== params.workspaceId) {
        continue;
      }

      // Filter by archived
      if (params?.archived !== undefined) {
        if (Boolean(meta.isArchived) !== params.archived) continue;
      } else {
        // Default to excluding archived unless explicitly requested
        if (meta.isArchived) continue;
      }

      // Filter by starred
      if (params?.starred && !meta.isStarred) {
        continue;
      }

      // Filter by search
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

  // Sorting
  const sortBy = params?.sortBy || "updatedAt";
  results.sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return results;
}

/**
 * Get spreadsheet full data (metadata, records, settings)
 */
export async function getSpreadsheet(
  id: string,
  customToken?: string
): Promise<SpreadsheetFullData> {
  ensureInitialMigration();

  const sheetDir = path.join(SPREADSHEETS_DIR, id);
  const metaFile = path.join(sheetDir, "metadata.json");
  const recordsFile = path.join(sheetDir, "backlinks.json");
  const settingsFile = path.join(sheetDir, "settings.json");

  if (!fs.existsSync(metaFile)) {
    throw new Error(`Spreadsheet "${id}" not found.`);
  }

  const metadata: SpreadsheetMetadata = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
  let records: BacklinkRecord[] = [];
  if (fs.existsSync(recordsFile)) {
    try {
      records = JSON.parse(fs.readFileSync(recordsFile, "utf-8"));
    } catch {}
  }

  let settings: SpreadsheetSettings = { autoExtractDomain: true };
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
    } catch {}
  }

  // Check GitHub if token configured
  const tokenToUse = customToken || getGitHubConfig().token;
  if (tokenToUse) {
    try {
      const ghPath = `data/spreadsheets/${id}/backlinks.json`;
      const ghResult = await readBacklinksFromGitHub(ghPath, tokenToUse);
      if (ghResult.data && ghResult.data.length > 0) {
        records = ghResult.data;
        return {
          metadata,
          records,
          settings,
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

  let initialRecords: BacklinkRecord[] = [];
  if (input.template === "backlinks" || input.template === "blank") {
    initialRecords = [];
  } else if (input.template === "citations") {
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
  };

  const settings: SpreadsheetSettings = {
    autoExtractDomain: true,
  };

  createSpreadsheetInternal(metadata, initialRecords, settings);

  // Commit to GitHub if token configured
  const tokenToUse = customToken || getGitHubConfig().token;
  let sha = `local-${Date.now()}`;
  let source: "github" | "local" = "local";

  if (tokenToUse) {
    try {
      const commitMsg = `feat(spreadsheet): create spreadsheet "${metadata.title}" [${metadata.id}]`;
      const res = await writeBacklinksToGitHub(
        `data/spreadsheets/${id}/backlinks.json`,
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
    sha,
    source,
  };
}

/**
 * Update spreadsheet metadata (title, star, archive, description, settings)
 */
export async function updateSpreadsheetMetadata(
  id: string,
  updates: Partial<SpreadsheetMetadata> & { settings?: Partial<SpreadsheetSettings> },
  customToken?: string
): Promise<SpreadsheetMetadata> {
  const sheetDir = path.join(SPREADSHEETS_DIR, id);
  const metaFile = path.join(sheetDir, "metadata.json");

  if (!fs.existsSync(metaFile)) {
    throw new Error(`Spreadsheet "${id}" not found.`);
  }

  const currentMeta: SpreadsheetMetadata = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
  const updatedMeta: SpreadsheetMetadata = {
    ...currentMeta,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(metaFile, JSON.stringify(updatedMeta, null, 2), "utf-8");

  // If settings updated
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
 * Save records for a spreadsheet (Autosave & manual commit)
 */
export async function saveSpreadsheetRecords(
  id: string,
  records: BacklinkRecord[],
  baseSha?: string,
  commitMessage?: string,
  customToken?: string
): Promise<{ success: boolean; sha: string; source: "github" | "local"; message: string }> {
  const sheetDir = path.join(SPREADSHEETS_DIR, id);
  const metaFile = path.join(sheetDir, "metadata.json");
  const recordsFile = path.join(sheetDir, "backlinks.json");

  if (!fs.existsSync(metaFile)) {
    throw new Error(`Spreadsheet "${id}" not found.`);
  }

  // 1. Write records locally
  fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2), "utf-8");

  // 2. Update metadata record count and updatedAt
  const meta: SpreadsheetMetadata = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
  meta.recordCount = records.length;
  meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), "utf-8");

  // 3. GitHub Commit
  const tokenToUse = customToken || getGitHubConfig().token;
  if (tokenToUse) {
    const ghPath = `data/spreadsheets/${id}/backlinks.json`;
    const defaultMsg =
      commitMessage ||
      `chore(spreadsheet): update "${meta.title}" [${records.length} records]`;

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
    message: "Saved to local repository cache (GitHub token not configured).",
  };
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

  createSpreadsheetInternal(metadata, original.records, original.settings);

  return {
    metadata,
    records: original.records,
    settings: original.settings,
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
