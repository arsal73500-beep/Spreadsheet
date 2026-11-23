import { NextRequest, NextResponse } from "next/server";
import { validateProjectAccess } from "@/lib/api-auth";
import { getProjectBacklinks, saveProjectBacklinks } from "@/lib/storage";
import { BacklinkSchema, BacklinkRecord } from "@/lib/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; id: string } }
) {
  const { projectId, id } = params;
  const access = validateProjectAccess(projectId, req, "canEdit");
  if (!access.authorized) return access.errorResponse!;

  try {
    const updates = await req.json();
    const { records: existing, sha } = await getProjectBacklinks(
      projectId,
      access.context.customToken
    );

    const index = existing.findIndex((r) => r.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: `Record with ID "${id}" not found in project "${projectId}".` },
        { status: 404 }
      );
    }

    const merged = { ...existing[index], ...updates };
    const validated = BacklinkSchema.safeParse(merged);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validated.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updatedRecords = [...existing];
    updatedRecords[index] = validated.data;

    const commitMsg = `fix(backlink): update record ${id} (${validated.data.domain}) in ${projectId}`;

    const saveResult = await saveProjectBacklinks(
      projectId,
      updatedRecords,
      sha,
      commitMsg,
      access.context.customToken
    );

    return NextResponse.json({
      success: true,
      record: validated.data,
      sha: saveResult.sha,
      source: saveResult.source,
      message: saveResult.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update record" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; id: string } }
) {
  const { projectId, id } = params;
  const access = validateProjectAccess(projectId, req, "canDelete");
  if (!access.authorized) return access.errorResponse!;

  try {
    const { records: existing, sha } = await getProjectBacklinks(
      projectId,
      access.context.customToken
    );

    const target = existing.find((r) => r.id === id);
    if (!target) {
      return NextResponse.json(
        { error: `Record with ID "${id}" not found in project "${projectId}".` },
        { status: 404 }
      );
    }

    const filtered = existing.filter((r) => r.id !== id);
    const commitMsg = `chore(backlink): delete record ${id} (${target.domain}) from ${projectId}`;

    const saveResult = await saveProjectBacklinks(
      projectId,
      filtered,
      sha,
      commitMsg,
      access.context.customToken
    );

    return NextResponse.json({
      success: true,
      deletedId: id,
      sha: saveResult.sha,
      source: saveResult.source,
      message: saveResult.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete record" },
      { status: 500 }
    );
  }
}
