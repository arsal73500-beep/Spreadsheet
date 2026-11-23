import { NextRequest, NextResponse } from "next/server";
import {
  getSpreadsheet,
  renameSheetTab,
  deleteSheetTab,
  setActiveSheetTab,
} from "@/lib/multi-storage";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; sheetId: string } }
) {
  const { id, sheetId } = params;
  const auth = await getApiAuthContext(req, "canView");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const data = await getSpreadsheet(id, auth.customToken, sheetId);
    return NextResponse.json({
      success: true,
      tabId: sheetId,
      records: data.records,
      metadata: data.metadata,
      sha: data.sha,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load sheet records" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sheetId: string } }
) {
  const { id, sheetId } = params;
  const auth = await getApiAuthContext(req, "canEdit");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();

    if (body.name) {
      const updatedMeta = await renameSheetTab(id, sheetId, body.name, auth.customToken);
      return NextResponse.json({
        success: true,
        metadata: updatedMeta,
      });
    }

    if (body.active) {
      const updatedMeta = await setActiveSheetTab(id, sheetId, auth.customToken);
      return NextResponse.json({
        success: true,
        metadata: updatedMeta,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update sheet tab" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; sheetId: string } }
) {
  const { id, sheetId } = params;
  const auth = await getApiAuthContext(req, "canDelete");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const updatedMeta = await deleteSheetTab(id, sheetId, auth.customToken);
    return NextResponse.json({
      success: true,
      message: `Deleted sheet tab "${sheetId}"`,
      metadata: updatedMeta,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete sheet tab" },
      { status: 400 }
    );
  }
}
