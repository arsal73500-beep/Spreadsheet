import { z } from "zod";

export const STATUS_OPTIONS = [
  "Pending",
  "Submitted",
  "Live",
  "Rejected",
  "Requires Verification",
  "Not Available",
  "Missing",
  "Broken",
] as const;

export type BacklinkStatus = (typeof STATUS_OPTIONS)[number];

export const CATEGORY_OPTIONS = [
  "Blog Comment",
  "Business Directory",
  "Local Directory",
  "Guest Post",
  "Forum",
  "Business Profile",
  "Organization Profile",
  "Resource Page",
  "Podcast",
  "Interview",
  "Social Profile",
  "Community",
  "Other",
] as const;

export type BacklinkCategory = (typeof CATEGORY_OPTIONS)[number];

export const ANCHOR_CATEGORY_OPTIONS = [
  "Naked URL",
  "Branded",
  "Exact Match",
  "Partial Match",
  "Related Keyword",
  "Generic",
] as const;

export type AnchorCategory = (typeof ANCHOR_CATEGORY_OPTIONS)[number];

export const LINK_TYPE_OPTIONS = [
  "Dofollow",
  "Nofollow",
  "Sponsored",
  "UGC",
  "Unknown",
] as const;

export type LinkType = (typeof LINK_TYPE_OPTIONS)[number];

export const TRAFFIC_TREND_OPTIONS = ["up", "down", "stable", "unknown"] as const;
export type TrafficTrend = (typeof TRAFFIC_TREND_OPTIONS)[number];

export const DOMAIN_RELEVANCE_OPTIONS = ["High", "Medium", "Low"] as const;
export type DomainRelevance = (typeof DOMAIN_RELEVANCE_OPTIONS)[number];

export const APPROVAL_DECISION_OPTIONS = [
  "Approved",
  "Pending Review",
  "Rejected",
] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISION_OPTIONS)[number];

export const BacklinkSchema = z.object({
  id: z.string().min(1, "ID is required"),
  backlinkUrl: z
    .string()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .default(""),
  status: z.enum(STATUS_OPTIONS).default("Pending"),
  account: z.string().default(""),
  category: z.enum(CATEGORY_OPTIONS).default("Other"),
  domain: z.string().min(1, "Domain is required"),
  dr: z.coerce.number().min(0).max(100).default(0),
  da: z.coerce.number().min(0).max(100).default(0),
  organicTraffic: z.coerce.number().min(0).default(0),
  trafficTrend: z.enum(TRAFFIC_TREND_OPTIONS).default("unknown"),
  domainRelevance: z.enum(DOMAIN_RELEVANCE_OPTIONS).default("Medium"),
  submissionUrl: z.string().default(""),
  anchorText: z.string().default(""),
  anchorCategory: z.enum(ANCHOR_CATEGORY_OPTIONS).default("Generic"),
  linkType: z.enum(LINK_TYPE_OPTIONS).default("Unknown"),
  approvalDecision: z.enum(APPROVAL_DECISION_OPTIONS).default("Pending Review"),
  dateAdded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  dateSubmitted: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .nullable()
    .default(null),
  lastChecked: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .nullable()
    .default(null),
  notes: z.string().default(""),
});

export type BacklinkRecord = z.infer<typeof BacklinkSchema>;

export const CreateBacklinkSchema = BacklinkSchema.partial({
  id: true,
  dateAdded: true,
}).transform((data) => ({
  ...data,
  id: data.id || `bl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  dateAdded: data.dateAdded || new Date().toISOString().split("T")[0],
}));

export function createEmptyBacklink(domain = ""): BacklinkRecord {
  const today = new Date().toISOString().split("T")[0];
  const uniqueId = `bl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: uniqueId,
    backlinkUrl: domain ? `https://${domain}` : "",
    status: "Pending",
    account: "",
    category: "Other",
    domain: domain || "newdomain.com",
    dr: 0,
    da: 0,
    organicTraffic: 0,
    trafficTrend: "unknown",
    domainRelevance: "Medium",
    submissionUrl: "",
    anchorText: "",
    anchorCategory: "Generic",
    linkType: "Unknown",
    approvalDecision: "Pending Review",
    dateAdded: today,
    dateSubmitted: null,
    lastChecked: null,
    notes: "",
  };
}

export function extractDomainFromUrl(url: string): string {
  try {
    const cleaned = url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
    const parsed = new URL(cleaned);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}
