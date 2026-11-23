import { Octokit } from "@octokit/rest";
import { BacklinkRecord } from "./schema";

export interface GitHubStorageConfig {
  owner: string;
  repo: string;
  branch: string;
  token?: string;
}

export function isVercelProduction(): boolean {
  return process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
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
 * Fetch and decode any JSON file directly from GitHub repository
 */
export async function readJsonFromGitHub<T = any>(
  filePath: string,
  customToken?: string
): Promise<{ data: T; sha: string } | null> {
  const octokit = getOctokitClient(customToken);
  const { owner, repo, branch } = getGitHubConfig();

  if (!octokit) {
    return null;
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
        data: parsed as T,
        sha: response.data.sha,
      };
    }
    return null;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Commit any JSON object to GitHub repository with SHA conflict check
 */
export async function writeJsonToGitHub(
  filePath: string,
  data: any,
  currentSha?: string,
  commitMessage?: string,
  customToken?: string
): Promise<WriteFileResult> {
  const octokit = getOctokitClient(customToken);
  const { owner, repo, branch } = getGitHubConfig();

  if (!octokit) {
    throw new Error(
      "GitHub Personal Access Token (GITHUB_TOKEN) is not configured. Please add GITHUB_TOKEN in your Vercel Project Settings or Settings dialog."
    );
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const encodedContent = Buffer.from(jsonContent, "utf-8").toString("base64");
  const defaultMessage = commitMessage || `chore(data): update ${filePath}`;

  try {
    let targetSha = currentSha;
    if (!targetSha || targetSha.startsWith("local-")) {
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
        targetSha = undefined;
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
      message: "Successfully committed changes to GitHub repository.",
    };
  } catch (error: any) {
    if (error.status === 409) {
      throw new Error(
        "Conflict detected: The file in GitHub has been modified remotely. Please refresh to load the latest changes before overwriting."
      );
    }
    throw new Error(`GitHub commit failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Delete a file in GitHub repository
 */
export async function deleteFileFromGitHub(
  filePath: string,
  currentSha?: string,
  commitMessage?: string,
  customToken?: string
): Promise<boolean> {
  const octokit = getOctokitClient(customToken);
  const { owner, repo, branch } = getGitHubConfig();

  if (!octokit) return false;

  try {
    let targetSha = currentSha;
    if (!targetSha || targetSha.startsWith("local-")) {
      const existing = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch,
      });
      if ("sha" in existing.data) {
        targetSha = existing.data.sha;
      }
    }

    if (!targetSha) return false;

    await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path: filePath,
      message: commitMessage || `chore(data): delete ${filePath}`,
      sha: targetSha,
      branch,
    });

    return true;
  } catch (error) {
    console.warn(`Could not delete ${filePath} from GitHub:`, error);
    return false;
  }
}

/**
 * List files/directories in a path on GitHub
 */
export async function listDirectoryFromGitHub(
  dirPath: string,
  customToken?: string
): Promise<{ name: string; path: string; type: "file" | "dir"; sha: string }[]> {
  const octokit = getOctokitClient(customToken);
  const { owner, repo, branch } = getGitHubConfig();

  if (!octokit) return [];

  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: dirPath,
      ref: branch,
    });

    if (Array.isArray(response.data)) {
      return response.data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type as "file" | "dir",
        sha: item.sha,
      }));
    }
    return [];
  } catch (error: any) {
    if (error.status === 404) {
      return [];
    }
    console.warn(`Failed to list GitHub directory ${dirPath}:`, error.message);
    return [];
  }
}

/**
 * Fetch backlink records from GitHub
 */
export async function readBacklinksFromGitHub(
  filePath: string,
  customToken?: string
): Promise<ReadFileResult> {
  const result = await readJsonFromGitHub<BacklinkRecord[]>(filePath, customToken);
  if (result) {
    return {
      data: Array.isArray(result.data) ? result.data : [],
      sha: result.sha,
      source: "github",
    };
  }
  return {
    data: [],
    sha: "",
    source: "github",
  };
}

/**
 * Write updated backlink records to GitHub repository
 */
export async function writeBacklinksToGitHub(
  filePath: string,
  records: BacklinkRecord[],
  currentSha?: string,
  commitMessage?: string,
  customToken?: string
): Promise<WriteFileResult> {
  return writeJsonToGitHub(filePath, records, currentSha, commitMessage, customToken);
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
    return [];
  }
}
