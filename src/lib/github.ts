import { Octokit } from "@octokit/rest";
import { BacklinkRecord } from "./schema";

export interface GitHubStorageConfig {
  owner: string;
  repo: string;
  branch: string;
  token?: string;
}

export function getGitHubConfig(): GitHubStorageConfig {
  return {
    owner: process.env.GITHUB_OWNER || "arsal73500-beep",
    repo: process.env.GITHUB_REPO || "Spreadsheet",
    branch: process.env.GITHUB_BRANCH || "main",
    token: process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "",
  };
}

export function getOctokitClient(customToken?: string): Octokit | null {
  const token = customToken || getGitHubConfig().token;
  if (!token) {
    return null;
  }
  return new Octokit({ auth: token });
}

export interface ReadFileResult {
  data: BacklinkRecord[];
  sha: string;
  source: "github" | "local";
}

export interface WriteFileResult {
  success: boolean;
  sha: string;
  commitUrl?: string;
  message: string;
}

/**
 * Fetch file contents and SHA from GitHub repository
 */
export async function readBacklinksFromGitHub(
  filePath: string,
  customToken?: string
): Promise<ReadFileResult> {
  const octokit = getOctokitClient(customToken);
  const { owner, repo, branch } = getGitHubConfig();

  if (!octokit) {
    throw new Error("GitHub token not configured on server.");
  }

  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch,
    });

    if ("content" in response.data && typeof response.data.content === "string") {
      const decoded = Buffer.from(response.data.content, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      return {
        data: Array.isArray(parsed) ? parsed : [],
        sha: response.data.sha,
        source: "github",
      };
    }

    throw new Error("Target file content format is invalid.");
  } catch (error: any) {
    if (error.status === 404) {
      // File doesn't exist yet on GitHub
      return {
        data: [],
        sha: "",
        source: "github",
      };
    }
    throw error;
  }
}

/**
 * Write updated records to GitHub repository with commit message and SHA conflict check
 */
export async function writeBacklinksToGitHub(
  filePath: string,
  records: BacklinkRecord[],
  currentSha?: string,
  commitMessage?: string,
  customToken?: string
): Promise<WriteFileResult> {
  const octokit = getOctokitClient(customToken);
  const { owner, repo, branch } = getGitHubConfig();

  if (!octokit) {
    throw new Error("GitHub token not configured on server.");
  }

  const jsonContent = JSON.stringify(records, null, 2);
  const encodedContent = Buffer.from(jsonContent, "utf-8").toString("base64");
  const defaultMessage = commitMessage || `chore(data): update ${filePath} [${records.length} records]`;

  try {
    // If SHA is not provided, fetch current SHA from GitHub to verify
    let targetSha = currentSha;
    if (!targetSha) {
      try {
        const existing = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: branch,
        });
        if ("sha" in existing.data) {
          targetSha = existing.data.sha;
        }
      } catch (err: any) {
        if (err.status !== 404) {
          throw err;
        }
      }
    }

    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: defaultMessage,
      content: encodedContent,
      branch,
      sha: targetSha || undefined,
    });

    return {
      success: true,
      sha: response.data.content?.sha || "",
      commitUrl: response.data.commit?.html_url,
      message: "Successfully committed changes to GitHub.",
    };
  } catch (error: any) {
    if (error.status === 409) {
      throw new Error(
        "Conflict detected: The file has been modified in the GitHub repository since your last read. Please refresh and merge changes."
      );
    }
    throw new Error(`GitHub commit failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Fetch recent commit history for a file
 */
export async function getFileCommitHistory(
  filePath: string,
  customToken?: string
) {
  const octokit = getOctokitClient(customToken);
  const { owner, repo, branch } = getGitHubConfig();

  if (!octokit) {
    return [];
  }

  try {
    const response = await octokit.rest.repos.listCommits({
      owner,
      repo,
      path: filePath,
      sha: branch,
      per_page: 15,
    });

    return response.data.map((item) => ({
      sha: item.sha.substring(0, 7),
      message: item.commit.message,
      author: item.commit.author?.name || "Unknown",
      date: item.commit.author?.date || new Date().toISOString(),
      url: item.html_url,
    }));
  } catch (error) {
    console.error("Failed to fetch commit history:", error);
    return [];
  }
}
