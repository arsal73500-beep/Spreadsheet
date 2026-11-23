import { NextRequest, NextResponse } from "next/server";
import { getSpreadsheet, saveSpreadsheetRecords } from "@/lib/multi-storage";
import { BacklinkRecord, createEmptyBacklink, extractDomainFromUrl } from "@/lib/schema";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const auth = await getApiAuthContext(req, "canAdd");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      domain,
      backlinkUrl,
      dr,
      da,
      organicTraffic,
      trafficTrend,
      category,
      domainRelevance,
      anchorText,
      anchorCategory,
      linkType,
      submissionUrl,
      notes,
    } = body;

    const { records: existing, sha, metadata } = await getSpreadsheet(id, auth.customToken);

    const targetDomain = domain || (backlinkUrl ? extractDomainFromUrl(backlinkUrl) : null);
    if (!targetDomain) {
      return NextResponse.json(
        { error: "A valid 'domain' or 'backlinkUrl' must be provided." },
        { status: 400 }
      );
    }

    const existingIndex = existing.findIndex(
      (r) => r.domain.toLowerCase() === targetDomain.toLowerCase()
    );

    let updatedRecords = [...existing];
    let resultRecord: BacklinkRecord;
    let actionSummary = "";

    if (existingIndex >= 0) {
      const current = existing[existingIndex];
      resultRecord = {
        ...current,
        dr: typeof dr === "number" ? Math.min(100, Math.max(0, dr)) : current.dr,
        da: typeof da === "number" ? Math.min(100, Math.max(0, da)) : current.da,
        organicTraffic: typeof organicTraffic === "number" ? organicTraffic : current.organicTraffic,
        trafficTrend: trafficTrend || current.trafficTrend,
        category: category || current.category,
        domainRelevance: domainRelevance || current.domainRelevance,
        anchorText: anchorText || current.anchorText,
        anchorCategory: anchorCategory || current.anchorCategory,
        linkType: linkType || current.linkType,
        submissionUrl: submissionUrl || current.submissionUrl,
        notes: notes ? (current.notes ? `${current.notes}\n${notes}` : notes) : current.notes,
        lastChecked: new Date().toISOString().split("T")[0],
      };
      updatedRecords[existingIndex] = resultRecord;
      actionSummary = `Updated research metrics for domain ${targetDomain}`;
    } else {
      resultRecord = {
        ...createEmptyBacklink(targetDomain),
        backlinkUrl: backlinkUrl || `https://${targetDomain}`,
        status: "Pending",
        dr: typeof dr === "number" ? Math.min(100, Math.max(0, dr)) : 0,
        da: typeof da === "number" ? Math.min(100, Math.max(0, da)) : 0,
        organicTraffic: typeof organicTraffic === "number" ? organicTraffic : 0,
        trafficTrend: trafficTrend || "unknown",
        category: category || "Other",
        domainRelevance: domainRelevance || "Medium",
        anchorText: anchorText || "",
        anchorCategory: anchorCategory || "Generic",
        linkType: linkType || "Unknown",
        submissionUrl: submissionUrl || "",
        notes: notes || "Researched via ChatGPT API",
      };
      updatedRecords = [resultRecord, ...existing];
      actionSummary = `Added new research opportunity for domain ${targetDomain}`;
    }

    const commitMsg = `feat(seo-research): ${actionSummary} in "${metadata.title}"`;
    const saveRes = await saveSpreadsheetRecords(
      id,
      updatedRecords,
      sha,
      commitMsg,
      auth.customToken
    );

    return NextResponse.json({
      success: true,
      message: actionSummary,
      record: resultRecord,
      sha: saveRes.sha,
      source: saveRes.source,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process research request" },
      { status: 500 }
    );
  }
}
