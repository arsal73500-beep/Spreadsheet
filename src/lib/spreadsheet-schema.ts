import { z } from "zod";
import { BacklinkRecord } from "./schema";

export interface WorkspaceConfig {
  id: string;
  name: string;
  slug: string;
  website: string;
  description: string;
  color: string;
  badgeClass: string;
}

export const WORKSPACES: Record<string, WorkspaceConfig> = {
  "md-health-center": {
    id: "md-health-center",
    name: "MD Health Center",
    slug: "md-health-center",
    website: "https://mdhealthcenter.com.pk/",
    description: "Healthcare, wellness, preventive care & clinical diagnostics",
    color: "#0f9d58",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  "aint-foundation": {
    id: "aint-foundation",
    name: "AINT Foundation",
    slug: "aint-foundation",
    website: "https://aintfoundationcic.co.uk/",
    description: "Community Interest Company (CIC) promoting mental & physical health",
    color: "#1a73e8",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "dr-irshad-malik": {
    id: "dr-irshad-malik",
    name: "Dr. Irshad Malik",
    slug: "dr-irshad-malik",
    website: "https://drirshadmalik.com/",
    description: "Renowned ENT surgeon, clinical consultations & medical research",
    color: "#9334e9",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  general: {
    id: "general",
    name: "General / Personal",
    slug: "general",
    website: "",
    description: "Personal and general purpose spreadsheets not tied to a client",
    color: "#5f6368",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

export interface SheetTab {
  id: string; // Permanent unique ID e.g. "tab_main" or "tab_1732..."
  name: string; // e.g. "Sheet 1", "Guest Posts", "Directories"
  order: number;
  recordCount: number;
  color?: string;
  settings?: {
    defaultSortColumn?: string;
    defaultSortDirection?: "asc" | "desc";
    visibleColumns?: Record<string, boolean>;
    columnWidths?: Record<string, number>;
  };
}

export interface SpreadsheetMetadata {
  id: string;
  title: string;
  workspaceId: string;
  description?: string;
  owner: string;
  ownerEmail?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  isStarred: boolean;
  isArchived: boolean;
  recordCount: number;
  activeSheetId?: string; // Remembers the currently active sheet tab
  sheets: SheetTab[]; // Array of sheet tabs
}

export interface SpreadsheetSettings {
  defaultSortColumn?: string;
  defaultSortDirection?: "asc" | "desc";
  autoExtractDomain: boolean;
  visibleColumns?: Record<string, boolean>;
}

export interface SpreadsheetFullData {
  metadata: SpreadsheetMetadata;
  records: BacklinkRecord[]; // Records of the active sheet
  settings: SpreadsheetSettings;
  activeSheetId: string;
  sha?: string;
  source: "github" | "local";
}

export const CreateSpreadsheetSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  workspaceId: z.string().default("general"),
  description: z.string().optional().default(""),
  template: z.enum(["blank", "backlinks", "citations", "outreach"]).default("backlinks"),
});

export type CreateSpreadsheetInput = z.infer<typeof CreateSpreadsheetSchema>;

export function generateSpreadsheetId(prefix = "sheet"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateSheetTabId(prefix = "tab"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}
