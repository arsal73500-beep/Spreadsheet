"use client";

import React, { useState } from "react";
import { X, Edit2, AlertCircle } from "lucide-react";
import { SpreadsheetMetadata } from "@/lib/spreadsheet-schema";

interface RenameSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheet: SpreadsheetMetadata | null;
  onRename: (id: string, newTitle: string) => Promise<void>;
}

export const RenameSpreadsheetModal: React.FC<RenameSpreadsheetModalProps> = ({
  isOpen,
  onClose,
  spreadsheet,
  onRename,
}) => {
  const [title, setTitle] = useState(spreadsheet?.title || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  React.useEffect(() => {
    if (spreadsheet) {
      setTitle(spreadsheet.title);
      setErrorMsg("");
    }
  }, [spreadsheet]);

  if (!isOpen || !spreadsheet) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Title cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      await onRename(spreadsheet.id, title.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to rename spreadsheet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 text-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-emerald-600" />
            <span>Rename Spreadsheet</span>
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Please enter a new name for the item:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold text-gray-800"
              autoFocus
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
            >
              {loading ? "Renaming..." : "OK"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
