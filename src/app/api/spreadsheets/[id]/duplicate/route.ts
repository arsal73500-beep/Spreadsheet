import { NextRequest, NextResponse } from "next/server";
import { duplicateSpreadsheet } from "@/lib/multi-storage";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { role, customToken } = getApiAuthContext(req);

  if (!hasPermission(role, "canAdd")) {
    return NextResponse.json(
      { error: "Forbidden: Viewer role cannot duplicate spreadsheets." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const ownerName = req.headers.get("x-user-name") || "Arsal Malik";

    const cloned = await duplicateSpreadsheet(
      id,
      body.title,
      ownerName,
      customToken
    );

    return NextResponse.json(
      {
        success: true,
        message: "Spreadsheet duplicated successfully.",
        spreadsheet: cloned.metadata,
        data: cloned,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to duplicate spreadsheet" },
      { status: 500 }
    );
  }
}
