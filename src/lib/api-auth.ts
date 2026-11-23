import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { UserRole, hasPermission, ROLE_PERMISSIONS } from "./auth";
import { isValidProjectId } from "./projects-config";
import { resolveEffectiveRole } from "./user-store";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  image?: string | null;
}

export interface ApiAuthContext {
  authenticated: boolean;
  user?: AuthenticatedUser;
  role: UserRole;
  customToken?: string;
  errorResponse?: NextResponse;
}

/**
 * Verify server-side NextAuth session for API requests.
 * Never trusts client-supplied role headers like `x-user-role`.
 */
export async function getApiAuthContext(
  req: NextRequest,
  requiredPermission?: keyof typeof ROLE_PERMISSIONS.admin
): Promise<ApiAuthContext> {
  const customToken = req.headers.get("x-github-token") || undefined;

  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    return {
      authenticated: false,
      role: "viewer",
      customToken,
      errorResponse: NextResponse.json(
        { error: "Unauthorized: An authenticated session is required to access this endpoint." },
        { status: 401 }
      ),
    };
  }

  // Derive role server-side only; check ADMIN_EMAILS allowlist authoritative override
  const email = session.user.email.toLowerCase().trim();
  const effectiveRole = resolveEffectiveRole(email, session.user.role as UserRole);

  const user: AuthenticatedUser = {
    id: session.user.id || email,
    email,
    name: session.user.name,
    role: effectiveRole,
    image: session.user.image,
  };

  // If a specific permission is required, enforce RBAC
  if (requiredPermission && !hasPermission(effectiveRole, requiredPermission)) {
    return {
      authenticated: true,
      user,
      role: effectiveRole,
      customToken,
      errorResponse: NextResponse.json(
        {
          error: `Forbidden: Current role "${effectiveRole}" lacks "${requiredPermission}" permission for this resource.`,
          requiredPermission,
          role: effectiveRole,
        },
        { status: 403 }
      ),
    };
  }

  return {
    authenticated: true,
    user,
    role: effectiveRole,
    customToken,
  };
}

/**
 * Validates access to legacy project routes (md-health-center, aint-foundation, dr-irshad-malik)
 */
export async function validateProjectAccess(
  projectId: string,
  req: NextRequest,
  requiredPermission: "canView" | "canAdd" | "canEdit" | "canDelete" | "canImport"
): Promise<{ authorized: boolean; errorResponse?: NextResponse; context: ApiAuthContext }> {
  const context = await getApiAuthContext(req, requiredPermission);

  if (!context.authenticated || context.errorResponse) {
    return {
      authorized: false,
      errorResponse: context.errorResponse,
      context,
    };
  }

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

  return { authorized: true, context };
}
