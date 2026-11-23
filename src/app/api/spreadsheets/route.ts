import { NextRequest, NextResponse } from "next/server";
import { listSpreadsheets, createSpreadsheet } from "@/lib/multi-storage";
import { CreateSpreadsheetSchema } from "@/lib/spreadsheet-schema";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getApiAuthContext(req, "canView");
    if (auth.errorResponse) return auth.errorResponse;

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
      auth.customToken
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
  const auth = await getApiAuthContext(req, "canAdd");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const validated = CreateSpreadsheetSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const ownerName = auth.user?.name || "User";
    const ownerEmail = auth.user?.email || "";

    const result = await createSpreadsheet(
      validated.data,
      { name: ownerName, email: ownerEmail },
      auth.customToken
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
