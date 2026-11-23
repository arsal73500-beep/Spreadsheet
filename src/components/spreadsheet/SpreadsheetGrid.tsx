"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  BacklinkRecord,
  STATUS_OPTIONS,
  CATEGORY_OPTIONS,
  ANCHOR_CATEGORY_OPTIONS,
  LINK_TYPE_OPTIONS,
  BacklinkStatus,
  BacklinkCategory,
  AnchorCategory,
  LinkType,
  extractDomainFromUrl,
} from "@/lib/schema";
import { UserRole, hasPermission } from "@/lib/auth";
import {
  ArrowUp,
  ArrowDown,
  Check,
  ExternalLink,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

export interface ColumnDef {
  key: keyof BacklinkRecord;
  letter: string;
  name: string;
  width: number;
  type: "text" | "number" | "dropdown" | "url" | "date";
  options?: readonly string[];
}

export const COLUMNS: ColumnDef[] = [
  { key: "backlinkUrl", letter: "A", name: "Backlink URL", width: 260, type: "url" },
  { key: "status", letter: "B", name: "Status", width: 140, type: "dropdown", options: STATUS_OPTIONS },
  { key: "domain", letter: "C", name: "Domain", width: 170, type: "text" },
  { key: "category", letter: "D", name: "Category", width: 160, type: "dropdown", options: CATEGORY_OPTIONS },
  { key: "dr", letter: "E", name: "DR", width: 75, type: "number" },
  { key: "da", letter: "F", name: "DA", width: 75, type: "number" },
  { key: "organicTraffic", letter: "G", name: "Organic Traffic", width: 120, type: "number" },
  { key: "anchorText", letter: "H", name: "Anchor Text", width: 180, type: "text" },
  { key: "anchorCategory", letter: "I", name: "Anchor Category", width: 140, type: "dropdown", options: ANCHOR_CATEGORY_OPTIONS },
  { key: "linkType", letter: "J", name: "Link Type", width: 105, type: "dropdown", options: LINK_TYPE_OPTIONS },
  { key: "account", letter: "K", name: "Account", width: 180, type: "text" },
  { key: "submissionUrl", letter: "L", name: "Submission URL", width: 220, type: "url" },
  { key: "dateAdded", letter: "M", name: "Date Added", width: 110, type: "date" },
  { key: "dateSubmitted", letter: "N", name: "Date Submitted", width: 115, type: "date" },
  { key: "lastChecked", letter: "O", name: "Last Checked", width: 115, type: "date" },
  { key: "notes", letter: "P", name: "Notes", width: 280, type: "text" },
];

interface SpreadsheetGridProps {
  records: BacklinkRecord[];
  currentRole: UserRole;
  onUpdateCell: (recordId: string, field: keyof BacklinkRecord, value: any) => void;
  selectedRowIds: Set<string>;
  onToggleSelectRow: (recordId: string) => void;
  onSelectAllRows: (selectAll: boolean) => void;
  visibleColumns: Record<string, boolean>;
  onActiveCellChange: (coord: string, value: string, colName: string) => void;
  externalCellValue?: { coord: string; value: string };
  sortConfig: { column: keyof BacklinkRecord | null; direction: "asc" | "desc" | null };
  onSortChange: (column: keyof BacklinkRecord) => void;
  onBulkStatusChange?: (status: BacklinkStatus) => void;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  records,
  currentRole,
  onUpdateCell,
  selectedRowIds,
  onToggleSelectRow,
  onSelectAllRows,
  visibleColumns,
  onActiveCellChange,
  sortConfig,
  onSortChange,
  onBulkStatusChange,
}) => {
  const [activeCell, setActiveCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const canEdit = hasPermission(currentRole, "canEdit");

  const activeCols = useMemo(() => {
    return COLUMNS.filter((c) => visibleColumns[c.key] !== false);
  }, [visibleColumns]);

  // Sync active cell info with Formula bar
  useEffect(() => {
    if (activeCell && records[activeCell.rowIdx] && activeCols[activeCell.colIdx]) {
      const col = activeCols[activeCell.colIdx];
      const rec = records[activeCell.rowIdx];
      const coord = `${col.letter}${activeCell.rowIdx + 1}`;
      const rawVal = rec[col.key];
      const strVal = rawVal === null || rawVal === undefined ? "" : String(rawVal);
      onActiveCellChange(coord, strVal, col.name);
    } else {
      onActiveCellChange("", "", "");
    }
  }, [activeCell, records, activeCols, onActiveCellChange]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const startEditing = useCallback(
    (rowIdx: number, colIdx: number, initialChar?: string) => {
      if (!canEdit) return;
      const col = activeCols[colIdx];
      const rec = records[rowIdx];
      if (!col || !rec) return;

      const currentVal = rec[col.key];
      const valStr = currentVal === null || currentVal === undefined ? "" : String(currentVal);
      setEditValue(initialChar !== undefined ? initialChar : valStr);
      setIsEditing(true);
    },
    [canEdit, activeCols, records]
  );

  const commitEdit = useCallback(() => {
    if (!activeCell || !isEditing) return;
    const col = activeCols[activeCell.colIdx];
    const rec = records[activeCell.rowIdx];
    if (!col || !rec) return;

    let finalVal: any = editValue;
    if (col.type === "number") {
      finalVal = editValue === "" ? 0 : Number(editValue) || 0;
      if (col.key === "dr" || col.key === "da") {
        finalVal = Math.min(100, Math.max(0, finalVal));
      }
    } else if (col.type === "date") {
      finalVal = editValue.trim() || null;
    }

    // Auto extract domain if editing backlinkUrl
    if (col.key === "backlinkUrl" && finalVal && !rec.domain) {
      const dom = extractDomainFromUrl(finalVal);
      if (dom) onUpdateCell(rec.id, "domain", dom);
    }

    onUpdateCell(rec.id, col.key, finalVal);
    setIsEditing(false);
  }, [activeCell, isEditing, activeCols, records, editValue, onUpdateCell]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!activeCell) return;

      if (isEditing) {
        if (e.key === "Enter") {
          e.preventDefault();
          commitEdit();
          // Move down
          if (activeCell.rowIdx < records.length - 1) {
            setActiveCell((prev) => prev ? { ...prev, rowIdx: prev.rowIdx + 1 } : null);
          }
        } else if (e.key === "Tab") {
          e.preventDefault();
          commitEdit();
          // Move right
          if (activeCell.colIdx < activeCols.length - 1) {
            setActiveCell((prev) => prev ? { ...prev, colIdx: prev.colIdx + 1 } : null);
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelEdit();
        }
        return;
      }

      // When NOT editing
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (activeCell.rowIdx < records.length - 1) {
          setActiveCell({ ...activeCell, rowIdx: activeCell.rowIdx + 1 });
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeCell.rowIdx > 0) {
          setActiveCell({ ...activeCell, rowIdx: activeCell.rowIdx - 1 });
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (activeCell.colIdx < activeCols.length - 1) {
          setActiveCell({ ...activeCell, colIdx: activeCell.colIdx + 1 });
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeCell.colIdx > 0) {
          setActiveCell({ ...activeCell, colIdx: activeCell.colIdx - 1 });
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        startEditing(activeCell.rowIdx, activeCell.colIdx);
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          if (activeCell.colIdx > 0) {
            setActiveCell({ ...activeCell, colIdx: activeCell.colIdx - 1 });
          }
        } else {
          if (activeCell.colIdx < activeCols.length - 1) {
            setActiveCell({ ...activeCell, colIdx: activeCell.colIdx + 1 });
          }
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (canEdit) {
          const col = activeCols[activeCell.colIdx];
          const rec = records[activeCell.rowIdx];
          if (col && rec) {
            onUpdateCell(rec.id, col.key, col.type === "number" ? 0 : "");
          }
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (canEdit) {
          startEditing(activeCell.rowIdx, activeCell.colIdx, e.key);
        }
      }
    },
    [
      activeCell,
      isEditing,
      records,
      activeCols,
      canEdit,
      commitEdit,
      cancelEdit,
      startEditing,
      onUpdateCell,
    ]
  );

  const allSelected = records.length > 0 && selectedRowIds.size === records.length;

  // Status color pill helper
  const getStatusBadge = (status: BacklinkStatus) => {
    switch (status) {
      case "Live":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Submitted":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-300";
      case "Requires Verification":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "Broken":
      case "Missing":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div
      ref={gridContainerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex-1 w-full h-full overflow-auto bg-white select-none focus:outline-none relative"
    >
      <table className="sheets-grid-table border-separate border-spacing-0 w-full text-xs">
        {/* Sticky Header Row */}
        <thead className="sticky top-0 z-20 bg-[#f8f9fa] shadow-[0_1px_0_0_#dadce0]">
          <tr>
            {/* Top-Left Corner Box: Select All */}
            <th className="sheets-header-cell sticky left-0 z-30 w-12 min-w-[48px] max-w-[48px] p-0 text-center bg-[#f8f9fa] border-b border-r border-gray-300">
              <div className="flex items-center justify-center h-7">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAllRows(e.target.checked)}
                  title="Select / Deselect all rows"
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                />
              </div>
            </th>

            {/* Column Headers */}
            {activeCols.map((col, cIdx) => {
              const isSorted = sortConfig.column === col.key;
              return (
                <th
                  key={col.key}
                  style={{ width: col.width, minWidth: col.width }}
                  onClick={() => onSortChange(col.key)}
                  className="sheets-header-cell h-7 px-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 hover:bg-[#e8eaed] cursor-pointer transition select-none group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-[10px] text-gray-400 group-hover:text-gray-600">
                        {col.letter}
                      </span>
                      <span className="truncate text-gray-800 font-medium">
                        {col.name}
                      </span>
                    </div>

                    {/* Sort Indicator */}
                    <div className="shrink-0 flex items-center">
                      {isSorted && (
                        sortConfig.direction === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                        )
                      )}
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Spreadsheet Data Rows */}
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td
                colSpan={activeCols.length + 1}
                className="py-16 text-center text-gray-400 text-sm"
              >
                No backlink records found in this project. Click "+ Add Row" or "Import CSV" to begin.
              </td>
            </tr>
          ) : (
            records.map((row, rIdx) => {
              const isRowSelected = selectedRowIds.has(row.id);

              return (
                <tr
                  key={row.id}
                  className={`hover:bg-[#f1f3f4]/70 transition-colors ${
                    isRowSelected ? "bg-[#e8f0fe]" : rIdx % 2 === 1 ? "bg-[#fafbfc]" : "bg-white"
                  }`}
                >
                  {/* Sticky Row Number & Selection Checkbox */}
                  <td className="sheets-row-num sticky left-0 z-10 w-12 min-w-[48px] max-w-[48px] p-0 text-center bg-[#f8f9fa] border-b border-r border-gray-300 select-none">
                    <div className="flex items-center justify-between px-1 h-7">
                      <input
                        type="checkbox"
                        checked={isRowSelected}
                        onChange={() => onToggleSelectRow(row.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3 h-3"
                      />
                      <span className="text-[10px] text-gray-500 font-mono flex-1 text-right pr-0.5">
                        {rIdx + 1}
                      </span>
                    </div>
                  </td>

                  {/* Editable Cells */}
                  {activeCols.map((col, cIdx) => {
                    const isCellActive =
                      activeCell?.rowIdx === rIdx && activeCell?.colIdx === cIdx;
                    const isCellEditing = isCellActive && isEditing;
                    const rawValue = row[col.key];
                    const displayValue =
                      rawValue === null || rawValue === undefined ? "" : String(rawValue);

                    return (
                      <td
                        key={col.key}
                        onClick={() => {
                          setActiveCell({ rowIdx: rIdx, colIdx: cIdx });
                        }}
                        onDoubleClick={() => {
                          setActiveCell({ rowIdx: rIdx, colIdx: cIdx });
                          startEditing(rIdx, cIdx);
                        }}
                        className={`sheets-cell h-7 px-2 text-gray-900 border-b border-r border-gray-200 relative cursor-cell ${
                          isCellActive
                            ? "outline outline-2 outline-blue-600 -outline-offset-1 z-10 bg-blue-50/20"
                            : ""
                        }`}
                        style={{ width: col.width, minWidth: col.width }}
                      >
                        {isCellEditing ? (
                          col.type === "dropdown" ? (
                            <select
                              ref={inputRef as any}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              className="w-full h-full px-1 py-0 text-xs bg-white border-none outline-none font-sans"
                            >
                              {col.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              ref={inputRef as any}
                              type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              className="w-full h-full px-0.5 py-0 text-xs bg-white border-none outline-none font-sans text-gray-900"
                            />
                          )
                        ) : (
                          <div className="flex items-center justify-between w-full h-full truncate">
                            {col.key === "status" ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(
                                  row.status
                                )}`}
                              >
                                {row.status}
                              </span>
                            ) : col.key === "dr" || col.key === "da" ? (
                              <span
                                className={`font-mono text-xs font-semibold ${
                                  (Number(displayValue) || 0) >= 50
                                    ? "text-emerald-700"
                                    : (Number(displayValue) || 0) >= 30
                                    ? "text-blue-700"
                                    : "text-gray-600"
                                }`}
                              >
                                {displayValue || "0"}
                              </span>
                            ) : col.key === "organicTraffic" ? (
                              <span className="font-mono text-xs text-gray-700">
                                {Number(displayValue) ? Number(displayValue).toLocaleString() : "0"}
                              </span>
                            ) : col.type === "url" && displayValue ? (
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="truncate text-blue-600 hover:underline">
                                  {displayValue}
                                </span>
                                <a
                                  href={displayValue.startsWith("http") ? displayValue : `https://${displayValue}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Open link in new tab"
                                  className="text-gray-400 hover:text-blue-600 shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="truncate">{displayValue}</span>
                            )}
                          </div>
                        )}

                        {/* Google Sheets active cell handle */}
                        {isCellActive && !isCellEditing && (
                          <div className="absolute bottom-[-3px] right-[-3px] w-2 h-2 bg-blue-600 cursor-crosshair z-20" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Floating Bulk Operations Toolbar */}
      {selectedRowIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-4 text-xs">
          <span className="font-medium bg-gray-800 px-2 py-1 rounded">
            {selectedRowIds.size} row{selectedRowIds.size > 1 ? "s" : ""} selected
          </span>

          {canEdit && onBulkStatusChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Set Status:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onBulkStatusChange(e.target.value as BacklinkStatus);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 focus:outline-none text-xs"
              >
                <option value="" disabled>
                  Choose status...
                </option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => onSelectAllRows(false)}
            className="text-gray-400 hover:text-white underline text-[11px]"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
};
