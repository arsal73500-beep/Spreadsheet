import fs from "fs";
import path from "path";
import { BacklinkRecord, BacklinkSchema } from "./schema";
import { getProjectConfig } from "./projects-config";
import {
  readBacklinksFromGitHub,
  writeBacklinksToGitHub,
  getFileCommitHistory,
  getGitHubConfig,
  isVercelProduction,
} from "./github";

export interface StorageResult {
  records: BacklinkRecord[];
  sha: string;
  source: "github" | "local";
  lastModified?: string;
}

function getLocalFilePath(projectFilePath: string): string {
  return path.join(process.cwd(), projectFilePath);
}

/**
 * Safely writes to local cache only in non-serverless environments.
 * Strictly never attempts filesystem writes when running on Vercel.
 */
function tryWriteLocalCache(filePath: string, data: any): void {
  if (isVercelProduction()) {
    return;
  }
  try {
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not update local disk cache:", err);
  }
}

/**
 * Read backlinks for a project: Attempts GitHub if configured, otherwise falls back to local data file
 */
export async function getProjectBacklinks(
  projectId: string,
  customToken?: string
): Promise<StorageResult> {
  const project = getProjectConfig(projectId);
  const localFile = getLocalFilePath(project.filePath);
  const githubConfig = getGitHubConfig();
  const tokenToUse = customToken || githubConfig.token;

  // 1. Try reading from GitHub if token is available
  if (tokenToUse) {
    try {
      const ghResult = await readBacklinksFromGitHub(project.filePath, tokenToUse);
      if (ghResult.data && ghResult.data.length > 0) {
        // Cache locally in local development environment
        tryWriteLocalCache(localFile, ghResult.data);
        return {
          records: ghResult.data,
          sha: ghResult.sha,
          source: "github",
        };
      }
    } catch (err: any) {
      console.warn("GitHub fetch failed, falling back to local file:", err.message);
    }
  }

  // 2. Read from bundled/local file (read-only safe on Vercel)
  if (fs.existsSync(localFile)) {
    try {
      const raw = fs.readFileSync(localFile, "utf-8");
      const parsed = JSON.parse(raw);
      const validated = Array.isArray(parsed)
        ? parsed.map((item) => {
            const res = BacklinkSchema.safeParse(item);
            return res.success ? res.data : item;
          })
        : [];
      const stats = fs.statSync(localFile);
      return {
        records: validated,
        sha: `local-${stats.mtimeMs}`,
        source: "local",
        lastModified: stats.mtime.toISOString(),
      };
    } catch (e) {
      console.error("Failed to parse local backlinks file:", e);
    }
  }

  return {
    records: [],
    sha: "",
    source: "local",
  };
}

/**
 * Save backlinks for a project: writes to GitHub when token configured or in Vercel production.
 * In local environment, updates local disk cache.
 */
export async function saveProjectBacklinks(
  projectId: string,
  records: BacklinkRecord[],
  sha?: string,
  commitMessage?: string,
  customToken?: string
): Promise<{ success: boolean; sha: string; source: "github" | "local"; message: string }> {
  const project = getProjectConfig(projectId);
  const localFile = getLocalFilePath(project.filePath);
  const githubConfig = getGitHubConfig();
  const tokenToUse = customToken || githubConfig.token;

  // In Vercel serverless environment, saving requires GitHub token
  if (isVercelProduction() && !tokenToUse) {
    throw new Error(
      "GitHub Token required: Production persistence on Vercel requires GITHUB_TOKEN configured in your Vercel Project Environment Variables or entered in the Settings dialog."
    );
  }

  // If GitHub token is present, commit to GitHub
  if (tokenToUse) {
    try {
      const ghWrite = await writeBacklinksToGitHub(
        project.filePath,
        records,
        sha?.startsWith("local-") ? undefined : sha,
        commitMessage,
        tokenToUse
      );
      // Asynchronously update local cache if local dev
      tryWriteLocalCache(localFile, records);
      return {
        success: true,
        sha: ghWrite.sha,
        source: "github",
        message: ghWrite.message,
      };
    } catch (error: any) {
      console.error("GitHub commit failed:", error.message);
      throw error;
    }
  }

  // Local development fallback
  tryWriteLocalCache(localFile, records);

  return {
    success: true,
    sha: `local-${Date.now()}`,
    source: "local",
    message: "Saved to local repository data cache (GitHub token not configured).",
  };
}

/**
 * Get commit history for a project's data file
 */
export async function getProjectHistory(projectId: string, customToken?: string) {
  const project = getProjectConfig(projectId);
  return getFileCommitHistory(project.filePath, customToken);
}
