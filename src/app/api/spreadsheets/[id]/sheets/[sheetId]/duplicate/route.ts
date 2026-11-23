import { NextRequest, NextResponse } from "next/server";
import { duplicateSheetTab } from "@/lib/multi-storage";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sheetId: string } }
) {
  const { id, sheetId } = params;
  const auth = await getApiAuthContext(req, "canAdd");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const result = await duplicateSheetTab(id, sheetId, auth.customToken);
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
