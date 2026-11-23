import { NextRequest, NextResponse } from "next/server";
import { listSpreadsheets, createSpreadsheet } from "@/lib/multi-storage";
import { CreateSpreadsheetSchema } from "@/lib/spreadsheet-schema";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { customToken } = getApiAuthContext(req);
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;
    const starred = searchParams.get("starred") === "true" ? true : undefined;
    const archivedParam = searchParams.get("archived");
    const archived = archivedParam === "true" ? true : archivedParam === "false" ? false : undefined;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "updatedAt";

    const spreadsheets = await listSpreadsheets(
      {
        workspaceId,
        starred,
        archived,
        search,
        sortBy,
      },
      customToken
    );

    return NextResponse.json({
      success: true,
      count: spreadsheets.length,
      spreadsheets,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list spreadsheets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { role, customToken } = getApiAuthContext(req);

  if (!hasPermission(role, "canAdd")) {
    return NextResponse.json(
      { error: "Forbidden: Viewer role cannot create spreadsheets." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const validated = CreateSpreadsheetSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const ownerName = req.headers.get("x-user-name") || "Arsal Malik";
    const ownerEmail = req.headers.get("x-user-email") || "arsal73500@gmail.com";

    const result = await createSpreadsheet(
      validated.data,
      { name: ownerName, email: ownerEmail },
      customToken
    );

    return NextResponse.json(
      {
        success: true,
        spreadsheet: result.metadata,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create spreadsheet" },
      { status: 500 }
    );
  }
}
