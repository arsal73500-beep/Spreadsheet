import { NextRequest, NextResponse } from "next/server";
import { UserRole, hasPermission } from "./auth";
import { isValidProjectId } from "./projects-config";

export interface ApiAuthContext {
  role: UserRole;
  customToken?: string;
}

export function getApiAuthContext(req: NextRequest): ApiAuthContext {
  const roleHeader = req.headers.get("x-user-role") as UserRole;
  const role: UserRole = roleHeader && ["admin", "editor", "viewer"].includes(roleHeader)
    ? roleHeader
    : "admin"; // Default to admin for full application owner usage

  const customToken = req.headers.get("x-github-token") || undefined;

  return { role, customToken };
}

export function validateProjectAccess(
  projectId: string,
  req: NextRequest,
  requiredPermission: "canView" | "canAdd" | "canEdit" | "canDelete" | "canImport"
): { authorized: boolean; errorResponse?: NextResponse; context: ApiAuthContext } {
  const context = getApiAuthContext(req);

  if (!isValidProjectId(projectId)) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: `Invalid project ID: "${projectId}". Allowed: md-health-center, aint-foundation, dr-irshad-malik.` },
        { status: 400 }
      ),
      context,
    };
  }

  if (!hasPermission(context.role, requiredPermission)) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          error: `Forbidden: Current role "${context.role}" lacks "${requiredPermission}" permission.`,
        },
        { status: 403 }
      ),
      context,
    };
  }

  return { authorized: true, context };
}
