import { NextRequest, NextResponse } from "next/server";
import {
  getSpreadsheet,
  updateSpreadsheetMetadata,
  deleteSpreadsheet,
  recordSpreadsheetOpened,
} from "@/lib/multi-storage";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { customToken } = getApiAuthContext(req);

  try {
    recordSpreadsheetOpened(id);
    const data = await getSpreadsheet(id, customToken);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load spreadsheet" },
      { status: error.message.includes("not found") ? 404 : 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { role, customToken } = getApiAuthContext(req);

  if (!hasPermission(role, "canEdit")) {
    return NextResponse.json(
      { error: "Forbidden: Viewer role cannot modify spreadsheet settings." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const updated = await updateSpreadsheetMetadata(id, body, customToken);

    return NextResponse.json({
      success: true,
      metadata: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update spreadsheet" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { role, customToken } = getApiAuthContext(req);

  if (!hasPermission(role, "canDelete")) {
    return NextResponse.json(
      { error: "Forbidden: Only Administrators can delete spreadsheets." },
      { status: 403 }
    );
  }

  try {
    await deleteSpreadsheet(id, customToken);
    return NextResponse.json({
      success: true,
      message: `Spreadsheet "${id}" permanently deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete spreadsheet" },
      { status: 500 }
    );
  }
}
