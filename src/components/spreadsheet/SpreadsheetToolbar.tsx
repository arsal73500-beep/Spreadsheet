"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Filter,
  ArrowUpDown,
  Upload,
  Download,
  RotateCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Save,
  Check,
} from "lucide-react";
import { UserRole, hasPermission } from "@/lib/auth";

interface SpreadsheetToolbarProps {
  currentRole: UserRole;
  onAddRow: () => void;
  onDeleteSelected: () => void;
  selectedCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenImport: () => void;
  onExportCsv: () => void;
  onRefresh: () => void;
  saveStatus: "saved" | "saving" | "unsaved" | "conflict" | "error";
  lastSavedAt: string | null;
  onManualSave: () => void;
  visibleColumns: Record<string, boolean>;
  onToggleColumn: (colKey: string) => void;
  onOpenFilterModal: () => void;
  isFiltered: boolean;
  onResetFilters: () => void;
}

export const SpreadsheetToolbar: React.FC<SpreadsheetToolbarProps> = ({
  currentRole,
  onAddRow,
  onDeleteSelected,
  selectedCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenImport,
  onExportCsv,
  onRefresh,
  saveStatus,
  lastSavedAt,
  onManualSave,
  visibleColumns,
  onToggleColumn,
  onOpenFilterModal,
  isFiltered,
  onResetFilters,
}) => {
  const [showColMenu, setShowColMenu] = useState(false);

  const canAdd = hasPermission(currentRole, "canAdd");
  const canDelete = hasPermission(currentRole, "canDelete");
  const canEdit = hasPermission(currentRole, "canEdit");
  const canImport = hasPermission(currentRole, "canImport");

  return (
    <div className="bg-[#edf2fa] border-b border-gray-300 px-3 py-1.5 flex items-center justify-between gap-2 select-none shrink-0 overflow-x-auto text-xs">
      {/* Left Operation Buttons */}
      <div className="flex items-center gap-1">
        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo || !canEdit}
          title="Undo (Ctrl+Z)"
          className="p-1.5 text-gray-700 hover:bg-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent rounded transition"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo || !canEdit}
          title="Redo (Ctrl+Y)"
          className="p-1.5 text-gray-700 hover:bg-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent rounded transition"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-gray-300 mx-1" />

        {/* Add Row */}
        <button
          onClick={onAddRow}
          disabled={!canAdd}
          title={canAdd ? "Add new backlink row" : "Permission required to add rows"}
          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-300 rounded shadow-sm text-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-600" />
          <span>Add Row</span>
        </button>

        {/* Delete Row */}
        <button
          onClick={onDeleteSelected}
          disabled={!canDelete || selectedCount === 0}
          title={
            !canDelete
              ? "Only Admins can delete rows"
              : selectedCount === 0
              ? "Select row(s) to delete"
              : `Delete ${selectedCount} selected row(s)`
          }
          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-300 rounded shadow-sm text-gray-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          <span>Delete {selectedCount > 0 ? `(${selectedCount})` : ""}</span>
        </button>

        <div className="h-4 w-[1px] bg-gray-300 mx-1" />

        {/* Filters */}
        <button
          onClick={onOpenFilterModal}
          title="Filter spreadsheet rows"
          className={`flex items-center gap-1 px-2 py-1 rounded border transition ${
            isFiltered
              ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
          {isFiltered && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onResetFilters();
              }}
              className="ml-1 text-[10px] bg-emerald-600 text-white rounded-full px-1 hover:bg-emerald-700"
              title="Clear all filters"
            >
              x
            </span>
          )}
        </button>

        {/* Column Visibility Menu */}
        <div className="relative">
          <button
            onClick={() => setShowColMenu(!showColMenu)}
            title="Toggle column visibility"
            className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-50 border border-gray-300 rounded text-gray-700 transition"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            <span>Columns</span>
          </button>

          {showColMenu && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg py-2 z-50 text-xs">
              <div className="px-3 py-1 font-semibold text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-100">
                Visible Columns
              </div>
              <div className="max-h-60 overflow-y-auto px-1 py-1">
                {Object.entries(visibleColumns).map(([key, isVis]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={isVis}
                      onChange={() => onToggleColumn(key)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-gray-300 mx-1" />

        {/* Import CSV */}
        <button
          onClick={onOpenImport}
          disabled={!canImport}
          title={canImport ? "Import Google Sheets CSV" : "Admin or Editor role required to import"}
          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-300 rounded shadow-sm text-gray-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Upload className="w-3.5 h-3.5 text-blue-600" />
          <span>Import CSV</span>
        </button>

        {/* Export CSV */}
        <button
          onClick={onExportCsv}
          title="Export project records to CSV"
          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-300 rounded shadow-sm text-gray-700 font-medium transition"
        >
          <Download className="w-3.5 h-3.5 text-purple-600" />
          <span>Export CSV</span>
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          title="Refresh data from repository"
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Side: Save Status & Commit Action */}
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
              <RotateCw className="w-3 h-3 animate-spin text-amber-600" />
              <span>Saving to GitHub...</span>
            </span>
          )}

          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>
                Saved {lastSavedAt ? `at ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </span>
            </span>
          )}

          {saveStatus === "unsaved" && (
            <span className="flex items-center gap-1.5 text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-medium">
              <Clock className="w-3 h-3 text-blue-600" />
              <span>Unsaved changes</span>
            </span>
          )}

          {saveStatus === "conflict" && (
            <span className="flex items-center gap-1.5 text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-bold">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Conflict: Remote SHA changed!</span>
            </span>
          )}

          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px] font-medium">
              <AlertTriangle className="w-3 h-3 text-red-600" />
              <span>Save error</span>
            </span>
          )}

          {/* Manual Save Button */}
          {saveStatus === "unsaved" && (
            <button
              onClick={onManualSave}
              className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-sm transition"
            >
              <Save className="w-3 h-3" />
              <span>Save Now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
