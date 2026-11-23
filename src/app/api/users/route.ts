import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/api-auth";
import { getUsersList } from "@/lib/user-store";

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req, "canManageTeam");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const users = await getUsersList(auth.customToken);
    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve user registry" },
      { status: 500 }
    );
  }
}
