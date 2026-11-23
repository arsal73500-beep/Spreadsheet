import { NextRequest, NextResponse } from "next/server";
import { validateProjectAccess } from "@/lib/api-auth";
import { getProjectBacklinks, saveProjectBacklinks } from "@/lib/storage";
import { CreateBacklinkSchema, BacklinkRecord } from "@/lib/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  const access = await validateProjectAccess(projectId, req, "canView");
  if (!access.authorized) return access.errorResponse!;

  try {
    const { records, sha, source, lastModified } = await getProjectBacklinks(
      projectId,
      access.context.customToken
    );

    return NextResponse.json({
      success: true,
      projectId,
      sha,
      source,
      lastModified,
      total: records.length,
      records,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load project backlinks" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  const access = await validateProjectAccess(projectId, req, "canAdd");
  if (!access.authorized) return access.errorResponse!;

  try {
    const body = await req.json();
    const parseResult = CreateBacklinkSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const newRecord: BacklinkRecord = parseResult.data;

    // Load existing
    const { records: existing, sha } = await getProjectBacklinks(
      projectId,
      access.context.customToken
    );

    // Duplicate check
    const duplicate = existing.find(
      (r) =>
        r.backlinkUrl &&
        r.backlinkUrl.toLowerCase() === newRecord.backlinkUrl.toLowerCase()
    );

    if (duplicate) {
      return NextResponse.json(
        {
          error: `Backlink URL already exists in this project (ID: ${duplicate.id}).`,
          duplicateId: duplicate.id,
        },
        { status: 409 }
      );
    }

    const updated = [newRecord, ...existing];
    const commitMsg = `feat(backlinks): add ${newRecord.domain} (${newRecord.status}) to ${projectId}`;

    const saveResult = await saveProjectBacklinks(
      projectId,
      updated,
      sha,
      commitMsg,
      access.context.customToken
    );

    return NextResponse.json(
      {
        success: true,
        record: newRecord,
        sha: saveResult.sha,
        source: saveResult.source,
        message: saveResult.message,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add backlink" },
      { status: 500 }
    );
  }
}
