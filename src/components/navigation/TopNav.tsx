"use client";

import React from "react";
import {
  Table2,
  BarChart3,
  Code2,
  Settings,
  Github,
  Shield,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { ProjectConfig } from "@/lib/projects-config";
import { UserRole } from "@/lib/auth";

interface TopNavProps {
  currentProject: ProjectConfig;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeView: "spreadsheet" | "analytics" | "api";
  onViewChange: (view: "spreadsheet" | "analytics" | "api") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSettings: () => void;
  isGitHubConnected: boolean;
  saveStatus: "saved" | "saving" | "unsaved" | "conflict" | "error";
  onManualSave: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentProject,
  currentRole,
  onRoleChange,
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  onOpenSettings,
  isGitHubConnected,
  saveStatus,
  onManualSave,
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between gap-4 select-none shrink-0 z-30">
      {/* Brand & Active Project */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Table2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm tracking-tight">
                Backlink Manager
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                v1.0
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>Active:</span>
              <span className="font-medium text-gray-800">{currentProject.name}</span>
              <a
                href={currentProject.website}
                target="_blank"
                rel="noreferrer"
                title={`Open ${currentProject.website}`}
                className="text-gray-400 hover:text-emerald-600 inline-flex items-center"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${currentProject.name} backlinks (domain, URL, anchor, notes)...`}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 transition"
          />
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-medium">
        <button
          onClick={() => onViewChange("spreadsheet")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
            activeView === "spreadsheet"
              ? "bg-white text-emerald-700 shadow-sm font-semibold"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Table2 className="w-3.5 h-3.5" />
          <span>Spreadsheet</span>
        </button>
        <button
          onClick={() => onViewChange("analytics")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
            activeView === "analytics"
              ? "bg-white text-emerald-700 shadow-sm font-semibold"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>
        <button
          onClick={() => onViewChange("api")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
            activeView === "api"
              ? "bg-white text-emerald-700 shadow-sm font-semibold"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ChatGPT & SEO APIs</span>
          <span className="sm:hidden">APIs</span>
        </button>
      </div>

      {/* Right Controls: Role, GitHub, Settings */}
      <div className="flex items-center gap-2">
        {/* Role Selector Badge */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs">
          <Shield className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-500 text-[11px] font-medium hidden sm:inline">Role:</span>
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-transparent text-gray-800 font-semibold text-xs focus:outline-none cursor-pointer capitalize"
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer (Read-only)</option>
          </select>
        </div>

        {/* GitHub Persistence Indicator */}
        <button
          onClick={onOpenSettings}
          title={
            isGitHubConnected
              ? "GitHub Connected: arsal73500-beep/Spreadsheet"
              : "Using Local Repository Data Cache (Click to configure GitHub Token)"
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition ${
            isGitHubConnected
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
              : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
          }`}
        >
          <Github className="w-3.5 h-3.5" />
          <span className="hidden lg:inline text-[11px]">
            {isGitHubConnected ? "GitHub Synced" : "Local Git Cache"}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isGitHubConnected ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Repository Settings & Team Management"
          className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
