import { NextRequest, NextResponse } from "next/server";
import { WORKSPACES } from "@/lib/spreadsheet-schema";
import { listSpreadsheets } from "@/lib/multi-storage";
import { getApiAuthContext } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { customToken } = getApiAuthContext(req);
    const allSheets = await listSpreadsheets({ archived: false }, customToken);

    const workspacesWithStats = Object.values(WORKSPACES).map((ws) => {
      const sheets = allSheets.filter((s) => s.workspaceId === ws.id);
      const totalRecords = sheets.reduce((sum, s) => sum + (s.recordCount || 0), 0);

      return {
        ...ws,
        spreadsheetCount: sheets.length,
        totalRecords,
        spreadsheets: sheets.map((s) => ({
          id: s.id,
          title: s.title,
          updatedAt: s.updatedAt,
          recordCount: s.recordCount,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      workspaces: workspacesWithStats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list workspaces" },
      { status: 500 }
    );
  }
}
