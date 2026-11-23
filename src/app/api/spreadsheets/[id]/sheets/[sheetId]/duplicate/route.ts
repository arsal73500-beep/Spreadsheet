import { NextRequest, NextResponse } from "next/server";
import { duplicateSheetTab } from "@/lib/multi-storage";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sheetId: string } }
) {
  const { id, sheetId } = params;
  const { role, customToken } = getApiAuthContext(req);

  if (!hasPermission(role, "canAdd")) {
    return NextResponse.json(
      { error: "Forbidden: Viewer role cannot duplicate sheet tabs." },
      { status: 403 }
    );
  }

  try {
    const result = await duplicateSheetTab(id, sheetId, customToken);
    return NextResponse.json(
      {
        success: true,
        message: `Duplicated sheet tab to "${result.clonedTab.name}"`,
        tab: result.clonedTab,
        metadata: result.metadata,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to duplicate sheet tab" },
      { status: 500 }
    );
  }
}
