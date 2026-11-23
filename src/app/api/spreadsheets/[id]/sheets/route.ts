import { NextRequest, NextResponse } from "next/server";
import { addSheetTab, reorderSheetTabs } from "@/lib/multi-storage";
import { getApiAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const auth = await getApiAuthContext(req, "canAdd");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const { name, records = [] } = body;

    const result = await addSheetTab(id, name, records, auth.customToken);

    return NextResponse.json(
      {
        success: true,
        message: `Created sheet tab "${result.newTab.name}"`,
        tab: result.newTab,
        metadata: result.metadata,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create sheet tab" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const auth = await getApiAuthContext(req, "canEdit");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { tabIds } = body;

    if (!Array.isArray(tabIds)) {
      return NextResponse.json(
        { error: "Payload must contain an array 'tabIds' of sheet tab IDs." },
        { status: 400 }
      );
    }

    const updated = await reorderSheetTabs(id, tabIds, auth.customToken);

    return NextResponse.json({
      success: true,
      metadata: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to reorder sheet tabs" },
      { status: 500 }
    );
  }
}
