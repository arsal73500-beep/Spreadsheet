import { NextRequest, NextResponse } from "next/server";
import { saveSheetTabRecords, getSpreadsheet } from "@/lib/multi-storage";
import { BacklinkSchema, BacklinkRecord } from "@/lib/schema";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sheetId: string } }
) {
  const { id, sheetId } = params;
  const auth = await getApiAuthContext(req, "canEdit");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { records, baseSha, commitMessage, mode = "replace" } = body;

    if (!Array.isArray(records)) {
      return NextResponse.json(
        { error: "Payload must contain an array 'records'." },
        { status: 400 }
      );
    }

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

    let finalRecords = validatedRecords;
    if (mode === "append") {
      const current = await getSpreadsheet(id, auth.customToken, sheetId);
      const existingUrls = new Set(
        current.records.map((r) => r.backlinkUrl?.toLowerCase().trim())
      );
      const newItems = validatedRecords.filter(
        (r) => !r.backlinkUrl || !existingUrls.has(r.backlinkUrl.toLowerCase().trim())
      );
      finalRecords = [...newItems, ...current.records];
    }

    const saveResult = await saveSheetTabRecords(
      id,
      sheetId,
      finalRecords,
      baseSha,
      commitMessage,
      auth.customToken
    );

    return NextResponse.json({
      success: true,
      tabId: sheetId,
      count: finalRecords.length,
      sha: saveResult.sha,
      source: saveResult.source,
      message: saveResult.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save sheet tab records" },
      { status: 500 }
    );
  }
}
