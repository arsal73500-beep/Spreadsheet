"use client";

import React, { useState } from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { SpreadsheetMetadata } from "@/lib/spreadsheet-schema";

interface DeleteSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheet: SpreadsheetMetadata | null;
  onDelete: (id: string) => Promise<void>;
}

export const DeleteSpreadsheetModal: React.FC<DeleteSpreadsheetModalProps> = ({
  isOpen,
  onClose,
  spreadsheet,
  onDelete,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !spreadsheet) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await onDelete(spreadsheet.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete spreadsheet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 text-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-red-50/50">
          <h2 className="text-sm font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Delete Spreadsheet Permanently</span>
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {errorMsg}
            </div>
          )}

          <p className="text-gray-700 text-xs leading-relaxed">
            Are you sure you want to delete <strong className="text-gray-900">"{spreadsheet.title}"</strong>?
          </p>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1 text-gray-600">
            <div className="flex justify-between">
              <span>Spreadsheet ID:</span>
              <span className="font-mono text-gray-800">{spreadsheet.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Records:</span>
              <span className="font-mono text-gray-800">{spreadsheet.recordCount} rows</span>
            </div>
          </div>

          <p className="text-red-600 text-[11px] font-medium">
            This action will delete the spreadsheet and commit the deletion to GitHub. It cannot be undone.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{loading ? "Deleting..." : "Delete Permanently"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
