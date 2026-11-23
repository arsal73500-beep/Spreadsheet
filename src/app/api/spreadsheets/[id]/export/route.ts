import { NextRequest, NextResponse } from "next/server";
import { exportEntireSpreadsheet } from "@/lib/multi-storage";
import { getApiAuthContext } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const fullExport = await exportEntireSpreadsheet(id);
    return NextResponse.json({
      success: true,
      data: fullExport,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to export spreadsheet" },
      { status: 500 }
    );
  }
}
