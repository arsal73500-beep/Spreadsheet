export type UserRole = "admin" | "editor" | "viewer";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export const ROLE_PERMISSIONS = {
  admin: {
    canView: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
    canImport: true,
    canExport: true,
    canManageTeam: true,
    canConfigureGitHub: true,
  },
  editor: {
    canView: true,
    canAdd: true,
    canEdit: true,
    canDelete: false,
    canImport: true,
    canExport: true,
    canManageTeam: false,
    canConfigureGitHub: false,
  },
  viewer: {
    canView: true,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canImport: false,
    canExport: true,
    canManageTeam: false,
    canConfigureGitHub: false,
  },
};

export const DEFAULT_USERS: UserSession[] = [
  {
    id: "usr_admin_1",
    name: "Arsal Malik (Admin)",
    email: "arsal73500@gmail.com",
    role: "admin",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_editor_1",
    name: "SEO Team Editor",
    email: "seo-team@backlinkmanager.internal",
    role: "editor",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_viewer_1",
    name: "Client Viewer",
    email: "viewer@partner.internal",
    role: "viewer",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
  },
];

export function hasPermission(
  role: UserRole,
  permission: keyof typeof ROLE_PERMISSIONS.admin
): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}
