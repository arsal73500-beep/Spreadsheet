"use client";

import React, { useState } from "react";
import { X, Plus, Table2, Check } from "lucide-react";
import { WORKSPACES } from "@/lib/spreadsheet-schema";

interface CreateSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: "blank" | "backlinks" | "citations" | "outreach";
  initialTitle?: string;
  defaultWorkspaceId?: string;
  onCreate: (data: {
    title: string;
    workspaceId: string;
    description: string;
    template: "blank" | "backlinks" | "citations" | "outreach";
  }) => Promise<void>;
}

export const CreateSpreadsheetModal: React.FC<CreateSpreadsheetModalProps> = ({
  isOpen,
  onClose,
  initialTemplate = "blank",
  initialTitle = "",
  defaultWorkspaceId = "general",
  onCreate,
}) => {
  const [title, setTitle] = useState(initialTitle || "Untitled spreadsheet");
  const [workspaceId, setWorkspaceId] = useState(
    defaultWorkspaceId === "all" ? "general" : defaultWorkspaceId
  );
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<"blank" | "backlinks" | "citations" | "outreach">(
    initialTemplate
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || "Untitled spreadsheet");
      setTemplate(initialTemplate || "blank");
      setWorkspaceId(defaultWorkspaceId === "all" ? "general" : defaultWorkspaceId);
      setErrorMsg("");
    }
  }, [isOpen, initialTitle, initialTemplate, defaultWorkspaceId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please enter a spreadsheet title.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      await onCreate({
        title: title.trim(),
        workspaceId,
        description: description.trim(),
        template,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create spreadsheet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 text-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            <span>Create New Spreadsheet</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Spreadsheet Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Local Citations, Directory Database, Outreach Opportunities"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Client / Project Workspace <span className="text-red-500">*</span>
            </label>
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs bg-white cursor-pointer font-medium"
            >
              {Object.values(WORKSPACES).map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.id})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              Each client workspace can hold multiple independent spreadsheets.
            </p>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Template Format</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "blank", name: "Blank Spreadsheet", desc: "Empty rows with standard schema" },
                { id: "backlinks", name: "Backlink Tracker", desc: "DR, DA, anchor, link status" },
                { id: "citations", name: "Local Citations", desc: "Google Business, directories" },
                { id: "outreach", name: "Healthcare Outreach", desc: "Guest posts & PR pitches" },
              ].map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => setTemplate(tmpl.id as any)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition ${
                    template === tmpl.id
                      ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <p className="font-semibold text-gray-800 text-xs">{tmpl.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{tmpl.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add campaign goals, purpose, or instructions..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              {loading ? "Creating..." : "Create Spreadsheet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
