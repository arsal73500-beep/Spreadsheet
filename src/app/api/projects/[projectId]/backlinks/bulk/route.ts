import { NextRequest, NextResponse } from "next/server";
import { validateProjectAccess } from "@/lib/api-auth";
import { getProjectBacklinks, saveProjectBacklinks } from "@/lib/storage";
import { BacklinkSchema, BacklinkRecord } from "@/lib/schema";

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  const access = await validateProjectAccess(projectId, req, "canEdit");
  if (!access.authorized) return access.errorResponse!;

  try {
    const body = await req.json();
    const {
      records,
      baseSha,
      commitMessage,
      mode = "replace", // 'replace' or 'append'
    } = body;

    if (!Array.isArray(records)) {
      return NextResponse.json(
        { error: "Payload must contain a 'records' array." },
        { status: 400 }
      );
    }

    // Validate each record
    const validatedRecords: BacklinkRecord[] = [];
    const validationErrors: { index: number; errors: any }[] = [];

    records.forEach((item: any, idx: number) => {
      const res = BacklinkSchema.safeParse(item);
      if (res.success) {
        validatedRecords.push(res.data);
      } else {
        validationErrors.push({ index: idx, errors: res.error.flatten() });
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Some records failed schema validation",
          errors: validationErrors.slice(0, 10),
          totalErrors: validationErrors.length,
        },
        { status: 400 }
      );
    }

    // Fetch current server state
    const current = await getProjectBacklinks(
      projectId,
      access.context.customToken
    );

    // Conflict detection: If baseSha is provided and differs from server SHA
    if (baseSha && current.sha && baseSha !== current.sha && !baseSha.startsWith("local-")) {
      return NextResponse.json(
        {
          error: "Conflict detected: The remote repository has changed since your last load.",
          conflict: true,
          serverSha: current.sha,
          clientSha: baseSha,
        },
        { status: 409 }
      );
    }

    let finalRecords: BacklinkRecord[] = [];
    if (mode === "append") {
      // Append without duplicate IDs or backlink URLs
      const existingUrls = new Set(
        current.records.map((r) => r.backlinkUrl?.toLowerCase().trim())
      );
      const newItems = validatedRecords.filter(
        (r) => !r.backlinkUrl || !existingUrls.has(r.backlinkUrl.toLowerCase().trim())
      );
      finalRecords = [...newItems, ...current.records];
    } else {
      finalRecords = validatedRecords;
    }

    const defaultMsg =
      commitMessage ||
      `chore(spreadsheet): batch update ${projectId} [${finalRecords.length} records]`;

    const saveResult = await saveProjectBacklinks(
      projectId,
      finalRecords,
      current.sha,
      defaultMsg,
      access.context.customToken
    );

    return NextResponse.json({
      success: true,
      count: finalRecords.length,
      sha: saveResult.sha,
      source: saveResult.source,
      message: saveResult.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute bulk update" },
      { status: 500 }
    );
  }
}
