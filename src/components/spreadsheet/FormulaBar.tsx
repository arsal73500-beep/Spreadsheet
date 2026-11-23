"use client";

import React from "react";
import { FunctionSquare } from "lucide-react";

interface FormulaBarProps {
  activeCellCoord: string; // e.g. "B4" or "-"
  activeCellValue: string;
  onValueChange: (val: string) => void;
  onCommit: () => void;
  readOnly: boolean;
  activeColumnName?: string;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeCellCoord,
  activeCellValue,
  onValueChange,
  onCommit,
  readOnly,
  activeColumnName,
}) => {
  return (
    <div className="bg-white border-b border-gray-300 px-3 py-1 flex items-center gap-2 select-none shrink-0 text-xs">
      {/* Cell Coordinate Box */}
      <div className="w-16 h-6 px-1.5 bg-gray-50 border border-gray-300 rounded flex items-center justify-center font-mono font-bold text-gray-700 text-xs shrink-0">
        {activeCellCoord || "-"}
      </div>

      {/* Column Name Hint */}
      {activeColumnName && (
        <span className="text-[11px] text-gray-400 font-medium shrink-0 max-w-[120px] truncate hidden sm:inline">
          [{activeColumnName}]
        </span>
      )}

      {/* fx icon */}
      <div className="text-gray-400 shrink-0 font-serif italic text-sm px-1">
        fx
      </div>

      <div className="h-4 w-[1px] bg-gray-300 shrink-0" />

      {/* Value Input Bar */}
      <input
        type="text"
        value={activeCellValue}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onCommit();
          }
        }}
        disabled={readOnly}
        placeholder={
          readOnly
            ? "Read-only mode (switch to Admin or Editor to edit)"
            : activeCellCoord
            ? "Enter cell value or formula..."
            : "Select a cell to inspect or edit..."
        }
        className="flex-1 px-2 py-0.5 text-xs bg-transparent focus:outline-none focus:bg-emerald-50/40 text-gray-800 font-sans disabled:text-gray-400 disabled:bg-gray-50"
      />
    </div>
  );
};
