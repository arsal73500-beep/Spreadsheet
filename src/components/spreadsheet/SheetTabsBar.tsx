"use client";

import React, { useState, useRef } from "react";
import {
  Plus,
  Menu,
  ChevronDown,
  Edit2,
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Download,
  Check,
} from "lucide-react";
import { SheetTab } from "@/lib/spreadsheet-schema";
import { UserRole, hasPermission } from "@/lib/auth";

interface SheetTabsBarProps {
  sheets: SheetTab[];
  activeSheetId: string;
  onSelectSheet: (sheetId: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (sheetId: string, newName: string) => void;
  onDuplicateSheet: (sheetId: string) => void;
  onDeleteSheet: (sheetId: string) => void;
  onReorderSheets: (reorderedIds: string[]) => void;
  onExportSheetCsv: (sheetId: string) => void;
  onExportEntireSpreadsheet: () => void;
  currentRole: UserRole;
}

export const SheetTabsBar: React.FC<SheetTabsBarProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onRenameSheet,
  onDuplicateSheet,
  onDeleteSheet,
  onReorderSheets,
  onExportSheetCsv,
  onExportEntireSpreadsheet,
  currentRole,
}) => {
  const [openMenuSheetId, setOpenMenuSheetId] = useState<string | null>(null);
  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState("");
  const [showAllSheetsMenu, setShowAllSheetsMenu] = useState(false);

  // Drag and drop state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const canAdd = hasPermission(currentRole, "canAdd");
  const canEdit = hasPermission(currentRole, "canEdit");
  const canDelete = hasPermission(currentRole, "canDelete");

  const sortedSheets = [...sheets].sort((a, b) => a.order - b.order);

  const handleStartRename = (sheet: SheetTab) => {
    setOpenMenuSheetId(null);
    setRenamingSheetId(sheet.id);
    setInlineName(sheet.name);
  };

  const handleCommitRename = (sheetId: string) => {
    if (inlineName.trim()) {
      onRenameSheet(sheetId, inlineName.trim());
    }
    setRenamingSheetId(null);
  };

  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const copyList = [...sortedSheets];
    const draggedItemContent = copyList.splice(dragItem.current, 1)[0];
    copyList.splice(dragOverItem.current, 0, draggedItemContent);

    dragItem.current = null;
    dragOverItem.current = null;

    onReorderSheets(copyList.map((s) => s.id));
  };

  const handleMove = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedSheets.length) return;

    const copyList = [...sortedSheets];
    const item = copyList.splice(index, 1)[0];
    copyList.splice(targetIndex, 0, item);

    setOpenMenuSheetId(null);
    onReorderSheets(copyList.map((s) => s.id));
  };

  return (
    <div className="bg-[#f1f3f4] border-t border-gray-300 px-2 py-0.5 flex items-center justify-between select-none shrink-0 z-30 h-9 text-xs">
      {/* Left controls: Add Sheet + All Sheets Menu */}
      <div className="flex items-center gap-1 shrink-0 pr-2 border-r border-gray-300 mr-2">
        {/* Add Sheet (+) Button */}
        <button
          onClick={onAddSheet}
          disabled={!canAdd}
          title={canAdd ? "Add Sheet (creates a new sheet tab)" : "Permission required to add sheets"}
          className="p-1 hover:bg-gray-200 text-gray-700 disabled:opacity-40 disabled:hover:bg-transparent rounded-full transition flex items-center justify-center w-7 h-7"
        >
          <Plus className="w-4 h-4 text-emerald-600 font-bold" />
        </button>

        {/* All Sheets Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowAllSheetsMenu(!showAllSheetsMenu)}
            title="All sheets"
            className="p-1 hover:bg-gray-200 text-gray-700 rounded-full transition flex items-center justify-center w-7 h-7"
          >
            <Menu className="w-4 h-4" />
          </button>

          {showAllSheetsMenu && (
            <div className="absolute left-0 bottom-full mb-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                Sheets ({sheets.length})
              </div>
              <div className="max-h-48 overflow-y-auto">
                {sortedSheets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setShowAllSheetsMenu(false);
                      onSelectSheet(s.id);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-gray-50 ${
                      s.id === activeSheetId ? "bg-emerald-50 text-emerald-800 font-bold" : "text-gray-700"
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{s.recordCount} rows</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-1">
                <button
                  onClick={() => {
                    setShowAllSheetsMenu(false);
                    onExportEntireSpreadsheet();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 text-[11px]"
                >
                  <Download className="w-3.5 h-3.5 text-purple-600" />
                  <span>Export Entire Spreadsheet</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Sheet Tabs List (Scrollable & Draggable) */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {sortedSheets.map((sheet, index) => {
          const isActive = sheet.id === activeSheetId;
          const isRenaming = renamingSheetId === sheet.id;

          return (
            <div
              key={sheet.id}
              draggable={!isRenaming}
              onDragStart={() => (dragItem.current = index)}
              onDragEnter={() => (dragOverItem.current = index)}
              onDragEnd={handleDragSort}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => {
                if (!isActive) onSelectSheet(sheet.id);
              }}
              onDoubleClick={() => {
                if (canEdit) handleStartRename(sheet);
              }}
              className={`group flex items-center gap-1.5 px-3 py-1 rounded-t-md cursor-pointer transition relative border-t border-l border-r ${
                isActive
                  ? "bg-white text-gray-900 border-gray-300 font-semibold shadow-xs z-10"
                  : "bg-[#e8eaed] text-gray-600 border-transparent hover:bg-[#dfe1e5] hover:text-gray-800"
              }`}
            >
              {/* Green bottom active indicator line */}
              {isActive && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-emerald-600 z-20" />
              )}

              {/* Sheet Name (or inline input when renaming) */}
              {isRenaming ? (
                <input
                  type="text"
                  value={inlineName}
                  onChange={(e) => setInlineName(e.target.value)}
                  onBlur={() => handleCommitRename(sheet.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitRename(sheet.id);
                    if (e.key === "Escape") setRenamingSheetId(null);
                  }}
                  autoFocus
                  className="px-1 py-0 bg-white border border-emerald-500 rounded text-xs font-semibold focus:outline-none w-28"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate max-w-[140px] text-xs select-none">
                  {sheet.name}
                </span>
              )}

              {/* Row count pill */}
              <span
                className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800 font-bold"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {sheet.recordCount}
              </span>

              {/* Tab Caret / Context Menu Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuSheetId(openMenuSheetId === sheet.id ? null : sheet.id);
                }}
                className={`p-0.5 rounded hover:bg-gray-200 transition ${
                  isActive ? "text-gray-600" : "text-gray-400 group-hover:text-gray-600"
                }`}
              >
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Tab Context Menu */}
              {openMenuSheetId === sheet.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 bottom-full mb-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 text-xs font-normal"
                >
                  {canEdit && (
                    <>
                      <button
                        onClick={() => handleStartRename(sheet)}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>Rename Sheet</span>
                      </button>

                      <button
                        onClick={() => {
                          setOpenMenuSheetId(null);
                          onDuplicateSheet(sheet.id);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        <span>Duplicate Sheet</span>
                      </button>

                      <div className="border-t border-gray-100 my-1" />

                      <button
                        onClick={() => handleMove(index, "left")}
                        disabled={index === 0}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2 text-gray-700"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
                        <span>Move Left</span>
                      </button>

                      <button
                        onClick={() => handleMove(index, "right")}
                        disabled={index === sortedSheets.length - 1}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2 text-gray-700"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <span>Move Right</span>
                      </button>

                      <div className="border-t border-gray-100 my-1" />
                    </>
                  )}

                  <button
                    onClick={() => {
                      setOpenMenuSheetId(null);
                      onExportSheetCsv(sheet.id);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    <span>Export Sheet as CSV</span>
                  </button>

                  {canDelete && (
                    <button
                      onClick={() => {
                        setOpenMenuSheetId(null);
                        onDeleteSheet(sheet.id);
                      }}
                      disabled={sortedSheets.length <= 1}
                      title={
                        sortedSheets.length <= 1
                          ? "Cannot delete the only sheet in a spreadsheet"
                          : "Delete sheet tab"
                      }
                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent text-red-600 flex items-center gap-2 border-t border-gray-100"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Delete Sheet</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right controls: Active Sheet Summary */}
      <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-500 pl-2 shrink-0">
        <span className="font-mono text-gray-600">
          Sheet {sortedSheets.findIndex((s) => s.id === activeSheetId) + 1} of {sortedSheets.length}
        </span>
      </div>
    </div>
  );
};
