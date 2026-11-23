"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Github,
  Shield,
  History,
  Key,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Users,
} from "lucide-react";
import { UserRole } from "@/lib/auth";
import { ProjectConfig } from "@/lib/projects-config";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  currentProject: ProjectConfig;
  customToken: string;
  onSaveToken: (token: string) => void;
  isGitHubConnected: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  currentProject,
  customToken,
  onSaveToken,
  isGitHubConnected,
}) => {
  const [tokenInput, setTokenInput] = useState(customToken);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Team management state (for admins)
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userUpdateMsg, setUserUpdateMsg] = useState("");

  useEffect(() => {
    setTokenInput(customToken);
  }, [customToken]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      if (currentRole === "admin") {
        loadUsers();
      }
    }
  }, [isOpen, currentProject.id, currentRole]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/history`, {
        headers: customToken ? { "x-github-token": customToken } : {},
      });
      const data = await res.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (e) {
      console.warn("Could not load history", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users", {
        headers: customToken ? { "x-github-token": customToken } : {},
      });
      const data = await res.json();
      if (data.users) {
        setUsersList(data.users);
      }
    } catch (e) {
      console.warn("Could not load team users", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUpdateRole = async (targetEmail: string, newRole: UserRole) => {
    setUserUpdateMsg("");
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(targetEmail)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(customToken ? { "x-github-token": customToken } : {}),
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserUpdateMsg(data.error || "Failed to update role");
      } else {
        setUserUpdateMsg(`Role updated for ${targetEmail}`);
        loadUsers();
      }
    } catch (err: any) {
      setUserUpdateMsg(err.message || "Failed to update role");
    }
  };

  const handleSaveToken = () => {
    onSaveToken(tokenInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-700" />
            <span>Application Settings & Team Permissions</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* GitHub Configuration Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                <Github className="w-4 h-4 text-gray-800" />
                <span>GitHub Repository Storage</span>
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                  isGitHubConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {isGitHubConnected ? "Connected" : "Local Git Cache"}
              </span>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div className="grid grid-cols-3 gap-2 text-gray-600">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400">
                    Repository
                  </span>
                  <span className="font-mono text-gray-900 font-semibold">
                    arsal73500-beep/Spreadsheet
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400">
                    Branch
                  </span>
                  <span className="font-mono text-gray-900">main</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400">
                    Data Path
                  </span>
                  <span className="font-mono text-gray-900">
                    {currentProject.filePath}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                GitHub Personal Access Token (PAT)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Requires 'repo' scope)"
                  className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  onClick={handleSaveToken}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-sm transition"
                >
                  Save Token
                </button>
              </div>
              {savedSuccess && (
                <p className="text-emerald-600 text-[11px] mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Token saved successfully.</span>
                </p>
              )}
              <p className="text-gray-500 text-[11px] mt-1">
                Tokens are sent securely via server headers or set as <code className="font-mono bg-gray-100 px-1 rounded">GITHUB_TOKEN</code> in your environment / Vercel.
              </p>
            </div>
          </div>

          <div className="h-[1px] bg-gray-200" />

          {/* Current Verified Role Section */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Your Role & Permissions (Verified Server-Side)</span>
            </h3>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 capitalize text-sm">
                    {currentRole} Role
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  {currentRole === "admin"
                    ? "Full application access. Allowed to manage spreadsheets, client workspaces, and team roles."
                    : currentRole === "editor"
                    ? "Authorized to create, edit, and import backlink records in authorized workspaces."
                    : "Read-only access. You can search, filter, and export backlink sheets."}
                </p>
              </div>
            </div>
          </div>

          {/* Admin-only Team Management Section */}
          {currentRole === "admin" && (
            <>
              <div className="h-[1px] bg-gray-200" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>Team Role Management (Admin Console)</span>
                  </h3>
                  <button
                    onClick={loadUsers}
                    disabled={loadingUsers}
                    className="text-gray-500 hover:text-gray-800 p-1"
                    title="Refresh user list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {userUpdateMsg && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-[11px]">
                    {userUpdateMsg}
                  </div>
                )}

                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-52 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="py-4 text-center text-gray-400">Loading team users...</div>
                  ) : usersList.length === 0 ? (
                    <div className="p-3 text-center text-gray-500">No registered users found.</div>
                  ) : (
                    usersList.map((user) => (
                      <div key={user.email} className="p-2.5 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">{user.name || user.email}</p>
                          <p className="text-[10px] text-gray-500">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.email, e.target.value as UserRole)}
                            className="px-2 py-1 bg-white border border-gray-300 rounded text-[11px] font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  Note: Elevating a user to Admin requires their email to also be in the <code className="font-mono bg-gray-100 px-1 rounded">ADMIN_EMAILS</code> allowlist.
                </p>
              </div>
            </>
          )}

          <div className="h-[1px] bg-gray-200" />

          {/* Commit History Viewer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                <History className="w-4 h-4 text-gray-700" />
                <span>Versioned Recovery & Commit History ({currentProject.name})</span>
              </h3>
              <button
                onClick={loadHistory}
                disabled={loadingHistory}
                className="text-gray-500 hover:text-gray-800 p-1"
                title="Refresh history"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-6 text-center text-gray-400">Loading commit log...</div>
            ) : history.length === 0 ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-center">
                No remote GitHub commits recorded yet for this project file. Commits are created automatically whenever you edit or import records.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {history.map((commit, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-800 text-xs">{commit.message}</p>
                      <p className="text-[10px] text-gray-500">
                        by {commit.author} on {new Date(commit.date).toLocaleString()}
                      </p>
                    </div>
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>{commit.sha}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded font-medium shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
