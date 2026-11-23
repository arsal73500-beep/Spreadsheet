import { NextRequest, NextResponse } from "next/server";
import { validateProjectAccess } from "@/lib/api-auth";
import { getProjectBacklinks, saveProjectBacklinks } from "@/lib/storage";
import { BacklinkRecord, createEmptyBacklink, extractDomainFromUrl } from "@/lib/schema";

/**
 * SEO & AI Research API Endpoint
 * For ChatGPT / External SEO Automation tool integration
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  const access = await validateProjectAccess(projectId, req, "canAdd");
  if (!access.authorized) return access.errorResponse!;

  try {
    const body = await req.json();
    const {
      action, // 'add_opportunity' | 'update_metrics' | 'classify' | 'batch_research'
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

    const { records: existing, sha } = await getProjectBacklinks(
      projectId,
      access.context.customToken
    );

    const targetDomain = domain || (backlinkUrl ? extractDomainFromUrl(backlinkUrl) : null);
    if (!targetDomain) {
      return NextResponse.json(
        { error: "A valid 'domain' or 'backlinkUrl' must be provided." },
        { status: 400 }
      );
    }

    // Check if domain already exists
    const existingIndex = existing.findIndex(
      (r) => r.domain.toLowerCase() === targetDomain.toLowerCase()
    );

    let updatedRecords = [...existing];
    let resultRecord: BacklinkRecord;
    let actionSummary = "";

    if (existingIndex >= 0) {
      // Update existing record
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
      // Create new researched opportunity
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
        notes: notes || "Added via SEO Research API",
      };
      updatedRecords = [resultRecord, ...existing];
      actionSummary = `Added new research opportunity for domain ${targetDomain}`;
    }

    const commitMsg = `feat(seo-research): ${actionSummary} in ${projectId}`;
    const saveResult = await saveProjectBacklinks(
      projectId,
      updatedRecords,
      sha,
      commitMsg,
      access.context.customToken
    );

    return NextResponse.json({
      success: true,
      message: actionSummary,
      record: resultRecord,
      sha: saveResult.sha,
      storageSource: saveResult.source,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process research request" },
      { status: 500 }
    );
  }
}
