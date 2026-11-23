"use client";

import React, { useState } from "react";
import {
  Table2,
  Search,
  Settings,
  Github,
  Shield,
  LogOut,
  User,
  Plus,
  ExternalLink,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { UserRole } from "@/lib/auth";

interface SpreadsheetHomeNavProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenSettings: () => void;
  isGitHubConnected: boolean;
  onNewSpreadsheet: () => void;
}

export const SpreadsheetHomeNav: React.FC<SpreadsheetHomeNavProps> = ({
  searchQuery,
  onSearchChange,
  currentRole,
  onRoleChange,
  onOpenSettings,
  isGitHubConnected,
  onNewSpreadsheet,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between gap-4 select-none shrink-0 sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm hover:bg-emerald-700 transition">
            <Table2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-base tracking-tight">
                Google Sheets
              </span>
              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Backlink Manager
              </span>
            </div>
            <span className="text-xs text-gray-400">Multi-Spreadsheet Workspace</span>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search spreadsheets (name, client, owner)..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 hover:bg-gray-50 focus:bg-white border border-transparent focus:border-emerald-500 rounded-full text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Create Button */}
        <button
          onClick={onNewSpreadsheet}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Spreadsheet</span>
        </button>

        {/* Role Selector Badge */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs">
          <Shield className="w-3.5 h-3.5 text-gray-500" />
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-transparent text-gray-800 font-semibold text-xs focus:outline-none cursor-pointer capitalize"
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {/* GitHub Indicator */}
        <button
          onClick={onOpenSettings}
          title={
            isGitHubConnected
              ? "GitHub Persistent Storage: arsal73500-beep/Spreadsheet"
              : "Using Local Repository Data Cache"
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition ${
            isGitHubConnected
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
              : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
          }`}
        >
          <Github className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px] font-medium">
            {isGitHubConnected ? "GitHub Synced" : "Local Git Cache"}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isGitHubConnected ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Repository & Workspace Settings"
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Profile Avatar / Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white shadow cursor-pointer"
          >
            A
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="font-semibold text-gray-900">Arsal Malik</p>
                <p className="text-[11px] text-gray-500">arsal73500@gmail.com</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold uppercase">
                  {currentRole}
                </span>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenSettings();
                  }}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5 text-gray-400" />
                  <span>Workspace Settings</span>
                </button>
                <a
                  href="https://github.com/arsal73500-beep/Spreadsheet"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                >
                  <Github className="w-3.5 h-3.5 text-gray-400" />
                  <span>GitHub Repository</span>
                </a>
              </div>
              <div className="border-t border-gray-100 pt-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left px-4 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
