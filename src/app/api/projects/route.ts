import { NextRequest, NextResponse } from "next/server";
import { PROJECTS } from "@/lib/projects-config";
import { getProjectBacklinks } from "@/lib/storage";
import { getApiAuthContext } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req, "canView");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const projectSummaries = await Promise.all(
      Object.values(PROJECTS).map(async (p) => {
        try {
          const { records, sha, source } = await getProjectBacklinks(p.id, auth.customToken);
          return {
            ...p,
            totalBacklinks: records.length,
            liveBacklinks: records.filter((r) => r.status === "Live").length,
            pendingBacklinks: records.filter((r) => r.status === "Pending").length,
            referringDomains: new Set(records.map((r) => r.domain.toLowerCase())).size,
            sha,
            storageSource: source,
          };
        } catch {
          return {
            ...p,
            totalBacklinks: 0,
            liveBacklinks: 0,
            pendingBacklinks: 0,
            referringDomains: 0,
            sha: "",
            storageSource: "local",
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      projects: projectSummaries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load projects" },
      { status: 500 }
    );
  }
}
