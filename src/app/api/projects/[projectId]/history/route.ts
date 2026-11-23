import { NextRequest, NextResponse } from "next/server";
import { validateProjectAccess } from "@/lib/api-auth";
import { getProjectHistory } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  const access = await validateProjectAccess(projectId, req, "canView");
  if (!access.authorized) return access.errorResponse!;

  try {
    const history = await getProjectHistory(
      projectId,
      access.context.customToken
    );

    return NextResponse.json({
      success: true,
      projectId,
      history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch project history" },
      { status: 500 }
    );
  }
}
