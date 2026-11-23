import fs from "fs";
import path from "path";
import { UserRole } from "./auth";
import {
  isVercelProduction,
  readJsonFromGitHub,
  writeJsonToGitHub,
  getGitHubConfig,
} from "./github";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: UserRole;
  assignedBy?: string;
  assignedAt?: string;
  createdAt: string;
  lastLoginAt?: string;
}

const USERS_FILE_PATH = "data/users/users.json";
const LOCAL_USERS_DIR = path.join(process.cwd(), "data", "users");
const LOCAL_USERS_FILE = path.join(LOCAL_USERS_DIR, "users.json");

/**
 * Checks whether an email address is listed in the ADMIN_EMAILS environment variable allowlist.
 * Supports comma-separated verified email addresses.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();

  const envAdminEmails = process.env.ADMIN_EMAILS || "";
  const allowlist = envAdminEmails
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

  // Default to application owner if ADMIN_EMAILS is not yet configured in environment
  if (allowlist.length === 0) {
    return normalizedEmail === "arsal73500@gmail.com";
  }

  return allowlist.includes(normalizedEmail);
}

/**
 * Resolves the effective role for a user.
 * Rule:
 * 1. An email on ADMIN_EMAILS is always "admin".
 * 2. An email NOT on ADMIN_EMAILS cannot be "admin". If stored as "admin", it is demoted to "editor".
 * 3. Otherwise returns stored role ("editor" | "viewer") or defaults new users to "viewer".
 */
export function resolveEffectiveRole(email: string, storedRole?: UserRole): UserRole {
  if (isAdminEmail(email)) {
    return "admin";
  }

  // Prevent unauthorized self-assigned or stale admin role
  if (storedRole === "admin") {
    return "editor";
  }

  if (storedRole === "editor") {
    return "editor";
  }

  return "viewer";
}

/**
 * Safe local write helper (skipped on Vercel)
 */
function tryWriteLocalUsers(users: StoredUser[]): void {
  if (isVercelProduction()) return;
  try {
    if (!fs.existsSync(LOCAL_USERS_DIR)) {
      fs.mkdirSync(LOCAL_USERS_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write local users store:", err);
  }
}

/**
 * Load all registered users from GitHub in production or local filesystem in development.
 */
export async function getUsersList(customToken?: string): Promise<StoredUser[]> {
  const token = customToken || getGitHubConfig().token;

  // 1. Production / GitHub-first
  if (isVercelProduction() || token) {
    if (token) {
      try {
        const ghResult = await readJsonFromGitHub<StoredUser[]>(USERS_FILE_PATH, token);
        if (ghResult?.data && Array.isArray(ghResult.data)) {
          return ghResult.data;
        }
      } catch (err) {
        console.warn("Could not read users from GitHub:", err);
      }
    }
  }

  // 2. Local filesystem
  if (fs.existsSync(LOCAL_USERS_FILE)) {
    try {
      const raw = fs.readFileSync(LOCAL_USERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.warn("Could not parse local users.json:", e);
    }
  }

  // Seed with default owner
  return [
    {
      id: "usr_admin_arsal",
      email: "arsal73500@gmail.com",
      name: "Arsal Malik",
      role: "admin",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    },
  ];
}

/**
 * Save users list to GitHub in production and local filesystem in development.
 */
export async function saveUsersList(users: StoredUser[], customToken?: string): Promise<void> {
  const token = customToken || getGitHubConfig().token;

  // Save to GitHub if running in Vercel or token available
  if (token) {
    try {
      await writeJsonToGitHub(
        USERS_FILE_PATH,
        users,
        undefined,
        `chore(auth): update user registry (${users.length} users)`,
        token
      );
    } catch (err: any) {
      console.error("Failed to commit users to GitHub:", err.message);
      if (isVercelProduction()) {
        throw new Error(`Failed to save user updates to GitHub: ${err.message}`);
      }
    }
  }

  // Update local disk cache
  tryWriteLocalUsers(users);
}

/**
 * Record a user sign-in and retrieve their effective profile and role.
 * New Google users receive "viewer" by default unless on ADMIN_EMAILS.
 */
export async function recordUserSignIn(userData: {
  id?: string;
  email: string;
  name?: string;
  image?: string;
}): Promise<StoredUser> {
  const normalizedEmail = userData.email.toLowerCase().trim();
  const users = await getUsersList();
  const existingIndex = users.findIndex((u) => u.email.toLowerCase().trim() === normalizedEmail);

  const now = new Date().toISOString();
  let userRecord: StoredUser;

  if (existingIndex !== -1) {
    const existing = users[existingIndex];
    const effectiveRole = resolveEffectiveRole(normalizedEmail, existing.role);

    userRecord = {
      ...existing,
      name: userData.name || existing.name,
      image: userData.image || existing.image,
      role: effectiveRole,
      lastLoginAt: now,
    };
    users[existingIndex] = userRecord;
  } else {
    // New user — defaults to viewer unless allowlisted admin
    const initialRole = resolveEffectiveRole(normalizedEmail, "viewer");

    userRecord = {
      id: userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: normalizedEmail,
      name: userData.name || normalizedEmail.split("@")[0],
      image: userData.image,
      role: initialRole,
      createdAt: now,
      lastLoginAt: now,
    };
    users.push(userRecord);
  }

  // Persist updated list asynchronously
  saveUsersList(users).catch((e) => console.warn("Failed background user save:", e));

  return userRecord;
}

/**
 * Admin action: promote or demote a user's role.
 * Rules:
 * - Only an Admin can call this.
 * - Admin cannot change their own role.
 * - Setting role to "admin" is only valid if target email is on ADMIN_EMAILS.
 */
export async function updateUserRole(
  targetEmail: string,
  newRole: UserRole,
  actorEmail: string,
  customToken?: string
): Promise<StoredUser> {
  if (!isAdminEmail(actorEmail)) {
    throw new Error("Forbidden: Only verified Administrators can manage user roles.");
  }

  const normalizedTarget = targetEmail.toLowerCase().trim();
  const normalizedActor = actorEmail.toLowerCase().trim();

  if (normalizedTarget === normalizedActor) {
    throw new Error("Bad Request: Administrators cannot modify their own role.");
  }

  if (newRole === "admin" && !isAdminEmail(normalizedTarget)) {
    throw new Error(
      `Forbidden: Cannot grant Admin role to "${normalizedTarget}". Email must first be added to the ADMIN_EMAILS environment allowlist.`
    );
  }

  const users = await getUsersList(customToken);
  const user = users.find((u) => u.email.toLowerCase().trim() === normalizedTarget);

  if (!user) {
    throw new Error(`User with email "${normalizedTarget}" was not found.`);
  }

  user.role = newRole;
  user.assignedBy = normalizedActor;
  user.assignedAt = new Date().toISOString();

  await saveUsersList(users, customToken);
  return user;
}
