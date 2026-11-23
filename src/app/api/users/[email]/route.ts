import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/api-auth";
import { updateUserRole } from "@/lib/user-store";
import { UserRole } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { email: string } }
) {
  const auth = await getApiAuthContext(req, "canManageTeam");
  if (auth.errorResponse) return auth.errorResponse;

  const targetEmail = decodeURIComponent(params.email);

  try {
    const body = await req.json();
    const { role } = body;

    if (!role || !["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Allowed values: admin, editor, viewer." },
        { status: 400 }
      );
    }

    const updatedUser = await updateUserRole(
      targetEmail,
      role as UserRole,
      auth.user!.email,
      auth.customToken
    );

    return NextResponse.json({
      success: true,
      message: `Updated role for ${targetEmail} to ${role}`,
      user: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update user role" },
      { status: error.message?.includes("Forbidden") ? 403 : 400 }
    );
  }
}
