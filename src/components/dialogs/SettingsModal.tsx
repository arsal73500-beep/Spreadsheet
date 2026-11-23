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
} from "lucide-react";
import { UserRole } from "@/lib/auth";
import { ProjectConfig } from "@/lib/projects-config";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentProject: ProjectConfig;
  customToken: string;
  onSaveToken: (token: string) => void;
  isGitHubConnected: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onRoleChange,
  currentProject,
  customToken,
  onSaveToken,
  isGitHubConnected,
}) => {
  const [tokenInput, setTokenInput] = useState(customToken);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setTokenInput(customToken);
  }, [customToken]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, currentProject.id]);

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
            <span>Application Settings & GitHub Integration</span>
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

          {/* Role Switching Section */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>User Role & Team Permissions (RBAC)</span>
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  role: "admin" as UserRole,
                  title: "Administrator",
                  desc: "Full application access. Add, edit, delete records, manage team and settings.",
                },
                {
                  role: "editor" as UserRole,
                  title: "Editor",
                  desc: "View and add records, update statuses, import CSV. Cannot delete rows.",
                },
                {
                  role: "viewer" as UserRole,
                  title: "Viewer",
                  desc: "Read-only access. Search, filter, export CSV. Cannot modify spreadsheet data.",
                },
              ].map((item) => (
                <div
                  key={item.role}
                  onClick={() => onRoleChange(item.role)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    currentRole === item.role
                      ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 capitalize">
                      {item.title}
                    </span>
                    {currentRole === item.role && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-gray-500 text-[11px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

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
