import { NextRequest, NextResponse } from "next/server";
import { saveSpreadsheetRecords, getSpreadsheet } from "@/lib/multi-storage";
import { BacklinkSchema, BacklinkRecord } from "@/lib/schema";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { role, customToken } = getApiAuthContext(req);

  if (!hasPermission(role, "canEdit")) {
    return NextResponse.json(
      { error: "Forbidden: Viewer role cannot edit spreadsheet records." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { records, baseSha, commitMessage, mode = "replace" } = body;

    if (!Array.isArray(records)) {
      return NextResponse.json(
        { error: "Payload must contain a 'records' array." },
        { status: 400 }
      );
    }

    // Validate records
    const validatedRecords: BacklinkRecord[] = [];
    const validationErrors: { index: number; error: any }[] = [];

    records.forEach((item: any, idx: number) => {
      const res = BacklinkSchema.safeParse(item);
      if (res.success) {
        validatedRecords.push(res.data);
      } else {
        validationErrors.push({ index: idx, error: res.error.flatten() });
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

    // Conflict detection if baseSha is supplied
    if (baseSha && !baseSha.startsWith("local-")) {
      const current = await getSpreadsheet(id, customToken);
      if (current.sha && current.sha !== baseSha && !current.sha.startsWith("local-")) {
        return NextResponse.json(
          {
            error: "Conflict detected: The remote repository version is newer than your loaded version.",
            conflict: true,
            serverSha: current.sha,
            clientSha: baseSha,
          },
          { status: 409 }
        );
      }
    }

    let finalRecords = validatedRecords;
    if (mode === "append") {
      const current = await getSpreadsheet(id, customToken);
      const existingUrls = new Set(
        current.records.map((r) => r.backlinkUrl?.toLowerCase().trim())
      );
      const newItems = validatedRecords.filter(
        (r) => !r.backlinkUrl || !existingUrls.has(r.backlinkUrl.toLowerCase().trim())
      );
      finalRecords = [...newItems, ...current.records];
    }

    const saveResult = await saveSpreadsheetRecords(
      id,
      finalRecords,
      baseSha,
      commitMessage,
      customToken
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
      { error: error.message || "Failed to save records" },
      { status: 500 }
    );
  }
}
