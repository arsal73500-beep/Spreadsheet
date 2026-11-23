import Papa from "papaparse";
import {
  BacklinkRecord,
  BacklinkSchema,
  createEmptyBacklink,
  extractDomainFromUrl,
  STATUS_OPTIONS,
  CATEGORY_OPTIONS,
  ANCHOR_CATEGORY_OPTIONS,
  LINK_TYPE_OPTIONS,
} from "./schema";

export interface ColumnMapping {
  backlinkUrl?: string;
  domain?: string;
  status?: string;
  account?: string;
  category?: string;
  dr?: string;
  da?: string;
  organicTraffic?: string;
  submissionUrl?: string;
  anchorText?: string;
  anchorCategory?: string;
  linkType?: string;
  dateAdded?: string;
  notes?: string;
}

export interface CsvParseResult {
  headers: string[];
  rawRows: Record<string, string>[];
  suggestedMapping: ColumnMapping;
}

export interface ImportValidationResult {
  validRecords: BacklinkRecord[];
  duplicates: { record: BacklinkRecord; existingId: string; reason: string }[];
  errors: { row: number; error: string; data: any }[];
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

  headers.forEach((h) => {
    const n = normalize(h);
    if (!mapping.backlinkUrl && (n.includes("backlink") || n === "url" || n.includes("targeturl") || n.includes("linkurl"))) {
      mapping.backlinkUrl = h;
    } else if (!mapping.domain && (n === "domain" || n.includes("rootdomain") || n.includes("website"))) {
      mapping.domain = h;
    } else if (!mapping.status && (n === "status" || n.includes("linkstatus") || n.includes("state"))) {
      mapping.status = h;
    } else if (!mapping.account && (n === "account" || n.includes("user") || n.includes("email") || n.includes("author"))) {
      mapping.account = h;
    } else if (!mapping.category && (n === "category" || n.includes("platform") || n.includes("type"))) {
      mapping.category = h;
    } else if (!mapping.dr && (n === "dr" || n.includes("domainrating") || n.includes("ahrefsdr"))) {
      mapping.dr = h;
    } else if (!mapping.da && (n === "da" || n.includes("domainauthority") || n.includes("mozda"))) {
      mapping.da = h;
    } else if (!mapping.organicTraffic && (n.includes("traffic") || n.includes("visitors") || n.includes("organictraffic"))) {
      mapping.organicTraffic = h;
    } else if (!mapping.submissionUrl && (n.includes("submission") || n.includes("registerurl") || n.includes("formurl"))) {
      mapping.submissionUrl = h;
    } else if (!mapping.anchorText && (n === "anchor" || n.includes("anchortext") || n.includes("keyword"))) {
      mapping.anchorText = h;
    } else if (!mapping.anchorCategory && (n.includes("anchorcategory") || n.includes("anchortype"))) {
      mapping.anchorCategory = h;
    } else if (!mapping.linkType && (n.includes("linktype") || n.includes("follow") || n.includes("dofollow"))) {
      mapping.linkType = h;
    } else if (!mapping.dateAdded && (n.includes("date") || n.includes("dateadded") || n.includes("created"))) {
      mapping.dateAdded = h;
    } else if (!mapping.notes && (n.includes("note") || n.includes("comment") || n.includes("description"))) {
      mapping.notes = h;
    }
  });

  return mapping;
}

export function parseCsvFile(csvContent: string): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        const headers = results.meta.fields || [];
        const suggestedMapping = detectColumnMapping(headers);
        resolve({
          headers,
          rawRows: results.data,
          suggestedMapping,
        });
      },
      error: (err: any) => reject(err),
    });
  });
}

export function processImportRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existingRecords: BacklinkRecord[]
): ImportValidationResult {
  const validRecords: BacklinkRecord[] = [];
  const duplicates: ImportValidationResult["duplicates"] = [];
  const errors: ImportValidationResult["errors"] = [];

  const existingUrlMap = new Map<string, string>();
  const existingDomainMap = new Map<string, string>();

  existingRecords.forEach((r) => {
    if (r.backlinkUrl) existingUrlMap.set(r.backlinkUrl.toLowerCase().trim(), r.id);
    if (r.domain) existingDomainMap.set(r.domain.toLowerCase().trim(), r.id);
  });

  rows.forEach((row, idx) => {
    try {
      const backlinkUrl = (mapping.backlinkUrl ? row[mapping.backlinkUrl] : "")?.trim() || "";
      const rawDomain = (mapping.domain ? row[mapping.domain] : "")?.trim();
      const domain = rawDomain || (backlinkUrl ? extractDomainFromUrl(backlinkUrl) : "");

      if (!domain && !backlinkUrl) {
        errors.push({
          row: idx + 1,
          error: "Row missing both Domain and Backlink URL.",
          data: row,
        });
        return;
      }

      // Check duplicates
      if (backlinkUrl && existingUrlMap.has(backlinkUrl.toLowerCase())) {
        duplicates.push({
          record: createEmptyBacklink(domain),
          existingId: existingUrlMap.get(backlinkUrl.toLowerCase())!,
          reason: `Backlink URL "${backlinkUrl}" already exists.`,
        });
        return;
      }

      // Normalize status
      const rawStatus = (mapping.status ? row[mapping.status] : "")?.trim();
      const status = STATUS_OPTIONS.find((s) => s.toLowerCase() === rawStatus?.toLowerCase()) || "Pending";

      // Normalize category
      const rawCat = (mapping.category ? row[mapping.category] : "")?.trim();
      const category = CATEGORY_OPTIONS.find((c) => c.toLowerCase() === rawCat?.toLowerCase()) || "Other";

      // Normalize anchor category
      const rawAncCat = (mapping.anchorCategory ? row[mapping.anchorCategory] : "")?.trim();
      const anchorCategory = ANCHOR_CATEGORY_OPTIONS.find((a) => a.toLowerCase() === rawAncCat?.toLowerCase()) || "Generic";

      // Normalize link type
      const rawLinkType = (mapping.linkType ? row[mapping.linkType] : "")?.trim();
      const linkType = LINK_TYPE_OPTIONS.find((l) => l.toLowerCase() === rawLinkType?.toLowerCase()) || "Unknown";

      // Date normalization
      let dateAdded = (mapping.dateAdded ? row[mapping.dateAdded] : "")?.trim();
      if (!dateAdded || !/^\d{4}-\d{2}-\d{2}$/.test(dateAdded)) {
        dateAdded = new Date().toISOString().split("T")[0];
      }

      const candidate: BacklinkRecord = {
        id: `bl_imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        backlinkUrl,
        status,
        account: (mapping.account ? row[mapping.account] : "")?.trim() || "",
        category,
        domain: domain.toLowerCase(),
        dr: Math.min(100, Math.max(0, parseInt(mapping.dr ? row[mapping.dr] : "0") || 0)),
        da: Math.min(100, Math.max(0, parseInt(mapping.da ? row[mapping.da] : "0") || 0)),
        organicTraffic: Math.max(0, parseInt(mapping.organicTraffic ? row[mapping.organicTraffic] : "0") || 0),
        trafficTrend: "unknown",
        domainRelevance: "Medium",
        submissionUrl: (mapping.submissionUrl ? row[mapping.submissionUrl] : "")?.trim() || "",
        anchorText: (mapping.anchorText ? row[mapping.anchorText] : "")?.trim() || "",
        anchorCategory,
        linkType,
        approvalDecision: "Approved",
        dateAdded,
        dateSubmitted: null,
        lastChecked: null,
        notes: (mapping.notes ? row[mapping.notes] : "")?.trim() || "",
      };

      const parseResult = BacklinkSchema.safeParse(candidate);
      if (parseResult.success) {
        validRecords.push(parseResult.data);
      } else {
        errors.push({
          row: idx + 1,
          error: parseResult.error.errors.map((e) => e.message).join(", "),
          data: candidate,
        });
      }
    } catch (err: any) {
      errors.push({
        row: idx + 1,
        error: err.message || "Unknown error processing row",
        data: row,
      });
    }
  });

  return { validRecords, duplicates, errors };
}

export function exportBacklinksToCsv(records: BacklinkRecord[], projectName: string): string {
  const fields = [
    "ID",
    "Backlink URL",
    "Status",
    "Account",
    "Category",
    "Domain",
    "DR",
    "DA",
    "Organic Traffic",
    "Traffic Trend",
    "Domain Relevance",
    "Submission URL",
    "Anchor Text",
    "Anchor Category",
    "Link Type",
    "Approval Decision",
    "Date Added",
    "Date Submitted",
    "Last Checked",
    "Notes",
  ];

  const data = records.map((r) => [
    r.id,
    r.backlinkUrl,
    r.status,
    r.account,
    r.category,
    r.domain,
    r.dr,
    r.da,
    r.organicTraffic,
    r.trafficTrend,
    r.domainRelevance,
    r.submissionUrl,
    r.anchorText,
    r.anchorCategory,
    r.linkType,
    r.approvalDecision,
    r.dateAdded,
    r.dateSubmitted || "",
    r.lastChecked || "",
    r.notes,
  ]);

  return Papa.unparse({
    fields,
    data,
  });
}
