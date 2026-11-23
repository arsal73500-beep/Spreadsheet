"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table2,
  Star,
  MoreVertical,
  Clock,
  Calendar,
  User,
  LayoutGrid,
  List,
  Folder,
  ArrowUpDown,
  ExternalLink,
  Edit2,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  Check,
} from "lucide-react";
import { SpreadsheetMetadata, WORKSPACES } from "@/lib/spreadsheet-schema";
import { UserRole, hasPermission } from "@/lib/auth";

interface SpreadsheetListProps {
  spreadsheets: SpreadsheetMetadata[];
  activeWorkspace: string;
  onSelectWorkspace: (wsId: string) => void;
  activeFilter: "all" | "recent" | "starred" | "archived";
  onSelectFilter: (f: "all" | "recent" | "starred" | "archived") => void;
  currentRole: UserRole;
  onStarToggle: (id: string, isStarred: boolean) => void;
  onOpenRename: (sheet: SpreadsheetMetadata) => void;
  onOpenDuplicate: (sheet: SpreadsheetMetadata) => void;
  onToggleArchive: (sheet: SpreadsheetMetadata) => void;
  onOpenDelete: (sheet: SpreadsheetMetadata) => void;
}

export const SpreadsheetList: React.FC<SpreadsheetListProps> = ({
  spreadsheets,
  activeWorkspace,
  onSelectWorkspace,
  activeFilter,
  onSelectFilter,
  currentRole,
  onStarToggle,
  onOpenRename,
  onOpenDuplicate,
  onToggleArchive,
  onOpenDelete,
}) => {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt" | "title">("updatedAt");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const canEdit = hasPermission(currentRole, "canEdit");
  const canDelete = hasPermission(currentRole, "canDelete");

  const handleOpenSheet = (id: string) => {
    router.push(`/sheets/${id}`);
  };

  const getWorkspacePill = (wsId: string) => {
    const ws = WORKSPACES[wsId];
    if (!ws) return null;
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ws.badgeClass}`}
      >
        {ws.name}
      </span>
    );
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-6 space-y-6 select-none overflow-y-auto">
      {/* 1. Client Workspaces Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => onSelectWorkspace("all")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition ${
            activeWorkspace === "all"
              ? "bg-gray-900 text-white font-semibold"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          All Workspaces
        </button>

        {Object.values(WORKSPACES).map((ws) => (
          <button
            key={ws.id}
            onClick={() => onSelectWorkspace(ws.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition ${
              activeWorkspace === ws.id
                ? "bg-gray-900 text-white font-semibold"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: ws.color }}
            />
            <span>{ws.name}</span>
          </button>
        ))}
      </div>

      {/* 2. Secondary Filter Bar & View Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3 text-xs">
        {/* Navigation Filters */}
        <div className="flex items-center gap-6 text-gray-600 font-medium">
          <button
            onClick={() => onSelectFilter("all")}
            className={`pb-3 relative transition ${
              activeFilter === "all" ? "text-emerald-700 font-bold" : "hover:text-gray-900"
            }`}
          >
            All spreadsheets
            {activeFilter === "all" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-emerald-600" />
            )}
          </button>

          <button
            onClick={() => onSelectFilter("recent")}
            className={`pb-3 relative transition ${
              activeFilter === "recent" ? "text-emerald-700 font-bold" : "hover:text-gray-900"
            }`}
          >
            Recent
            {activeFilter === "recent" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-emerald-600" />
            )}
          </button>

          <button
            onClick={() => onSelectFilter("starred")}
            className={`pb-3 relative transition ${
              activeFilter === "starred" ? "text-emerald-700 font-bold" : "hover:text-gray-900"
            }`}
          >
            Starred
            {activeFilter === "starred" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-emerald-600" />
            )}
          </button>

          <button
            onClick={() => onSelectFilter("archived")}
            className={`pb-3 relative transition ${
              activeFilter === "archived" ? "text-rose-700 font-bold" : "hover:text-gray-900"
            }`}
          >
            Archived / Trash
            {activeFilter === "archived" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-rose-600" />
            )}
          </button>
        </div>

        {/* View mode & Sort */}
        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-gray-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-medium text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="updatedAt">Last modified</option>
              <option value="createdAt">Date created</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          <div className="h-4 w-[1px] bg-gray-300" />

          {/* Grid vs List toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition ${
                viewMode === "grid" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition ${
                viewMode === "list" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"
              }`}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Empty State */}
      {spreadsheets.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <Table2 className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">No spreadsheets found</h3>
          <p className="text-gray-500 text-xs max-w-sm mx-auto">
            {activeFilter === "starred"
              ? "No starred spreadsheets yet. Click the star icon on any spreadsheet to access it quickly here."
              : activeFilter === "archived"
              ? "Your archive is currently empty."
              : "Create a new spreadsheet or switch workspace filters to explore spreadsheets."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* 4. Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {spreadsheets.map((sheet) => (
            <div
              key={sheet.id}
              onClick={() => handleOpenSheet(sheet.id)}
              className="group bg-white border border-gray-200 hover:border-emerald-500 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between relative"
            >
              {/* Spreadsheet Card Header / Preview Area */}
              <div className="p-4 bg-gradient-to-b from-[#f8f9fa] to-white border-b border-gray-100 flex flex-col justify-between h-28 relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Table2 className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Star button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStarToggle(sheet.id, !sheet.isStarred);
                      }}
                      className="p-1 text-gray-400 hover:text-amber-500 transition"
                      title={sheet.isStarred ? "Remove star" : "Star spreadsheet"}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          sheet.isStarred ? "fill-amber-400 text-amber-500" : ""
                        }`}
                      />
                    </button>

                    {/* Three-dot Context Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === sheet.id ? null : sheet.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === sheet.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-40 text-xs"
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              handleOpenSheet(sheet.id);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            <span>Open</span>
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onOpenRename(sheet);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                                <span>Rename</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onOpenDuplicate(sheet);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                              >
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                                <span>Duplicate</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onToggleArchive(sheet);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                              >
                                {sheet.isArchived ? (
                                  <>
                                    <ArchiveRestore className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Restore</span>
                                  </>
                                ) : (
                                  <>
                                    <Archive className="w-3.5 h-3.5 text-gray-400" />
                                    <span>Archive</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                onOpenDelete(sheet);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-gray-100"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Workspace pill */}
                <div>{getWorkspacePill(sheet.workspaceId)}</div>
              </div>

              {/* Spreadsheet Card Body */}
              <div className="p-4 space-y-2">
                <h4 className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 truncate leading-snug">
                  {sheet.title}
                </h4>

                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>
                      {new Date(sheet.updatedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                    {sheet.recordCount} rows
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 5. List View */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fa] border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-4 w-10"></th>
                <th className="py-2.5 px-4">Title</th>
                <th className="py-2.5 px-4">Workspace</th>
                <th className="py-2.5 px-4">Owner</th>
                <th className="py-2.5 px-4">Last modified</th>
                <th className="py-2.5 px-4">Rows</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {spreadsheets.map((sheet) => (
                <tr
                  key={sheet.id}
                  onClick={() => handleOpenSheet(sheet.id)}
                  className="hover:bg-gray-50 transition cursor-pointer group"
                >
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStarToggle(sheet.id, !sheet.isStarred);
                      }}
                      className="text-gray-300 hover:text-amber-500 transition"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          sheet.isStarred ? "fill-amber-400 text-amber-500" : ""
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-gray-900 group-hover:text-emerald-700 flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate max-w-[280px]">{sheet.title}</span>
                  </td>
                  <td className="py-2.5 px-4">{getWorkspacePill(sheet.workspaceId)}</td>
                  <td className="py-2.5 px-4 text-gray-600">{sheet.owner}</td>
                  <td className="py-2.5 px-4 text-gray-500">
                    {new Date(sheet.updatedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-gray-600">{sheet.recordCount}</td>
                  <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenSheet(sheet.id)}
                        className="p-1 text-gray-400 hover:text-gray-800 rounded"
                        title="Open"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => onOpenRename(sheet)}
                          className="p-1 text-gray-400 hover:text-gray-800 rounded"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => onOpenDelete(sheet)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
