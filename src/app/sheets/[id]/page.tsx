"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Table2,
  ArrowLeft,
  Star,
  Save,
  CheckCircle2,
  RotateCw,
  Clock,
  AlertTriangle,
  Settings,
  Github,
  Shield,
  Search,
  ExternalLink,
  ChevronDown,
  BarChart3,
  Code2,
} from "lucide-react";
import { SpreadsheetMetadata, SpreadsheetSettings, WORKSPACES } from "@/lib/spreadsheet-schema";
import { BacklinkRecord, createEmptyBacklink, BacklinkStatus } from "@/lib/schema";
import { UserRole, hasPermission } from "@/lib/auth";
import { exportBacklinksToCsv } from "@/lib/csv-parser";

import { SpreadsheetToolbar } from "@/components/spreadsheet/SpreadsheetToolbar";
import { FormulaBar } from "@/components/spreadsheet/FormulaBar";
import { SpreadsheetGrid, COLUMNS } from "@/components/spreadsheet/SpreadsheetGrid";
import { CsvImportModal } from "@/components/dialogs/CsvImportModal";
import { SettingsModal } from "@/components/dialogs/SettingsModal";
import { FilterModal, FilterState } from "@/components/dialogs/FilterModal";
import { MetricsDashboard } from "@/components/dashboard/MetricsDashboard";
import { ApiDocumentationView } from "@/components/api-docs/ApiDocumentationView";

export default function SpreadsheetEditorPage() {
  const params = useParams();
  const router = useRouter();
  const spreadsheetId = params.id as string;

  const [metadata, setMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [settings, setSettings] = useState<SpreadsheetSettings>({ autoExtractDomain: true });
  const [records, setRecords] = useState<BacklinkRecord[]>([]);
  const [baseSha, setBaseSha] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [activeView, setActiveView] = useState<"spreadsheet" | "analytics" | "api">("spreadsheet");
  const [currentRole, setCurrentRole] = useState<UserRole>("admin");

  // Sync state
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "conflict" | "error">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean>(false);
  const [customToken, setCustomToken] = useState<string>("");

  // Grid Selection & Edit State
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [activeCellCoord, setActiveCellCoord] = useState<string>("");
  const [activeCellValue, setActiveCellValue] = useState<string>("");
  const [activeColumnName, setActiveColumnName] = useState<string>("");

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<BacklinkRecord[][]>([]);
  const [redoStack, setRedoStack] = useState<BacklinkRecord[][]>([]);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    COLUMNS.forEach((c) => {
      init[c.key] = true;
    });
    return init;
  });

  // Sorting
  const [sortConfig, setSortConfig] = useState<{
    column: keyof BacklinkRecord | null;
    direction: "asc" | "desc" | null;
  }>({
    column: null,
    direction: null,
  });

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load token from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("backlink_manager_gh_token");
      if (stored) {
        setCustomToken(stored);
        setIsGitHubConnected(true);
      }
    }
  }, []);

  // Fetch spreadsheet data
  const loadSpreadsheet = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const headers: Record<string, string> = {
        "x-user-role": currentRole,
      };
      if (customToken) headers["x-github-token"] = customToken;

      const res = await fetch(`/api/spreadsheets/${spreadsheetId}`, { headers });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load spreadsheet");
      }

      setMetadata(json.data.metadata);
      setEditedTitle(json.data.metadata.title);
      setRecords(json.data.records || []);
      setSettings(json.data.settings || { autoExtractDomain: true });
      setBaseSha(json.data.sha || "");
      setIsGitHubConnected(json.data.source === "github" || Boolean(customToken));
      setSaveStatus("saved");
      setLastSavedAt(json.data.metadata.updatedAt);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load spreadsheet");
      setSaveStatus("error");
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, currentRole, customToken]);

  useEffect(() => {
    loadSpreadsheet();
  }, [loadSpreadsheet]);

  // Persist records
  const persistChanges = useCallback(
    async (recordsToSave: BacklinkRecord[], commitMsg?: string) => {
      setSaveStatus("saving");
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "x-user-role": currentRole,
        };
        if (customToken) headers["x-github-token"] = customToken;

        const res = await fetch(`/api/spreadsheets/${spreadsheetId}/records`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            records: recordsToSave,
            baseSha,
            commitMessage:
              commitMsg ||
              `chore(spreadsheet): update "${metadata?.title}" [${recordsToSave.length} records]`,
            mode: "replace",
          }),
        });

        const result = await res.json();

        if (res.status === 409 || result.conflict) {
          setSaveStatus("conflict");
          alert(
            "Conflict detected: The GitHub repository was updated remotely. Please refresh to load latest changes."
          );
          return;
        }

        if (!res.ok) {
          throw new Error(result.error || "Save failed");
        }

        setBaseSha(result.sha);
        setSaveStatus("saved");
        setLastSavedAt(new Date().toISOString());
        if (metadata) {
          setMetadata({
            ...metadata,
            recordCount: recordsToSave.length,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        console.error("Save error:", err);
        setSaveStatus("error");
      }
    },
    [spreadsheetId, baseSha, currentRole, customToken, metadata]
  );

  // Debounced auto-save
  const triggerAutoSave = useCallback(
    (newRecords: BacklinkRecord[]) => {
      setSaveStatus("unsaved");
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        persistChanges(newRecords);
      }, 1500);
    },
    [persistChanges]
  );

  // Update cell
  const handleUpdateCell = useCallback(
    (recordId: string, field: keyof BacklinkRecord, value: any) => {
      if (!hasPermission(currentRole, "canEdit")) {
        alert("You do not have permission to edit records in this role.");
        return;
      }

      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.id === recordId);
        if (idx === -1) return prev;

        setUndoStack((u) => [...u, prev]);
        setRedoStack([]);

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          [field]: value,
        };

        triggerAutoSave(updated);
        return updated;
      });
    },
    [currentRole, triggerAutoSave]
  );

  // Add row
  const handleAddRow = () => {
    if (!hasPermission(currentRole, "canAdd")) return;
    const newRow = createEmptyBacklink();
    setUndoStack((u) => [...u, records]);
    setRedoStack([]);

    const updated = [newRow, ...records];
    setRecords(updated);
    triggerAutoSave(updated);
  };

  // Delete selected
  const handleDeleteSelected = () => {
    if (!hasPermission(currentRole, "canDelete")) {
      alert("Only Administrators are permitted to delete rows.");
      return;
    }
    if (selectedRowIds.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedRowIds.size} row(s)? This will commit changes to GitHub.`
      )
    ) {
      return;
    }

    setUndoStack((u) => [...u, records]);
    setRedoStack([]);

    const filtered = records.filter((r) => !selectedRowIds.has(r.id));
    setRecords(filtered);
    setSelectedRowIds(new Set());
    triggerAutoSave(filtered);
  };

  // Bulk status
  const handleBulkStatusChange = (status: BacklinkStatus) => {
    if (!hasPermission(currentRole, "canEdit") || selectedRowIds.size === 0) return;

    setUndoStack((u) => [...u, records]);
    setRedoStack([]);

    const updated = records.map((r) => {
      if (selectedRowIds.has(r.id)) {
        return { ...r, status };
      }
      return r;
    });

    setRecords(updated);
    triggerAutoSave(updated);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, records]);
    setUndoStack(undoStack.slice(0, -1));
    setRecords(prev);
    triggerAutoSave(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, records]);
    setRedoStack(redoStack.slice(0, -1));
    setRecords(next);
    triggerAutoSave(next);
  };

  // Rename Title inline
  const handleCommitTitle = async () => {
    setIsRenamingTitle(false);
    if (!editedTitle.trim() || editedTitle === metadata?.title) return;

    try {
      const res = await fetch(`/api/spreadsheets/${spreadsheetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-role": currentRole },
        body: JSON.stringify({ title: editedTitle.trim() }),
      });
      const data = await res.json();
      if (data.metadata) {
        setMetadata(data.metadata);
      }
    } catch (e) {
      console.warn("Failed to rename title", e);
    }
  };

  // Star Toggle
  const handleToggleStar = async () => {
    if (!metadata) return;
    const newStar = !metadata.isStarred;
    setMetadata({ ...metadata, isStarred: newStar });

    try {
      await fetch(`/api/spreadsheets/${spreadsheetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-role": currentRole },
        body: JSON.stringify({ isStarred: newStar }),
      });
    } catch {}
  };

  // CSV Import handler
  const handleConfirmImport = async (importedRecords: BacklinkRecord[]) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-user-role": currentRole,
    };
    if (customToken) headers["x-github-token"] = customToken;

    const res = await fetch(`/api/spreadsheets/${spreadsheetId}/records`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        records: importedRecords,
        mode: "append",
        commitMessage: `feat(import): imported ${importedRecords.length} records into "${metadata?.title}"`,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to commit imported records");
    }

    loadSpreadsheet();
  };

  // CSV Export handler
  const handleExportCsv = () => {
    if (!metadata) return;
    const csvString = exportBacklinksToCsv(filteredAndSortedRecords, metadata.title);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Sort
  const filteredAndSortedRecords = useMemo(() => {
    let list = [...records];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.domain.toLowerCase().includes(q) ||
          r.backlinkUrl.toLowerCase().includes(q) ||
          r.anchorText.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q) ||
          r.account.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }

    if (filters.status) list = list.filter((r) => r.status === filters.status);
    if (filters.category) list = list.filter((r) => r.category === filters.category);
    if (filters.domain) list = list.filter((r) => r.domain.toLowerCase().includes(filters.domain!.toLowerCase()));
    if (filters.minDr !== undefined) list = list.filter((r) => r.dr >= filters.minDr!);
    if (filters.maxDr !== undefined) list = list.filter((r) => r.dr <= filters.maxDr!);
    if (filters.minDa !== undefined) list = list.filter((r) => r.da >= filters.minDa!);
    if (filters.maxDa !== undefined) list = list.filter((r) => r.da <= filters.maxDa!);
    if (filters.minTraffic !== undefined) list = list.filter((r) => r.organicTraffic >= filters.minTraffic!);
    if (filters.anchorCategory) list = list.filter((r) => r.anchorCategory === filters.anchorCategory);
    if (filters.linkType) list = list.filter((r) => r.linkType === filters.linkType);

    if (sortConfig.column && sortConfig.direction) {
      const col = sortConfig.column;
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      list.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === "number" && typeof valB === "number") return (valA - valB) * dir;
        return String(valA).localeCompare(String(valB)) * dir;
      });
    }

    return list;
  }, [records, searchQuery, filters, sortConfig]);

  const isFiltered = Boolean(
    searchQuery.trim() ||
      filters.status ||
      filters.category ||
      filters.domain ||
      filters.minDr !== undefined ||
      filters.maxDr !== undefined ||
      filters.minDa !== undefined ||
      filters.maxDa !== undefined ||
      filters.minTraffic !== undefined ||
      filters.anchorCategory ||
      filters.linkType
  );

  const currentWorkspace = metadata ? WORKSPACES[metadata.workspaceId] || WORKSPACES.general : WORKSPACES.general;

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8f9fa] space-y-3 select-none">
        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md animate-pulse">
          <Table2 className="w-6 h-6" />
        </div>
        <p className="text-gray-600 text-xs font-semibold">Opening spreadsheet from repository...</p>
      </div>
    );
  }

  if (errorMsg || !metadata) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8f9fa] space-y-4 select-none p-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Spreadsheet Not Found</h2>
        <p className="text-gray-500 text-xs max-w-md text-center">{errorMsg || "The requested spreadsheet does not exist or has been removed."}</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-emerald-700 transition"
        >
          Back to Spreadsheets Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#f8f9fa] overflow-hidden select-none">
      {/* 1. Google Sheets Editor Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between gap-4 select-none shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Back to Spreadsheets Button */}
          <button
            onClick={() => router.push("/")}
            title="Back to Spreadsheets Dashboard"
            className="w-9 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm transition shrink-0"
          >
            <Table2 className="w-5 h-5" />
          </button>

          {/* Spreadsheet Title & Star */}
          <div>
            <div className="flex items-center gap-2">
              {isRenamingTitle ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleCommitTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitTitle();
                    if (e.key === "Escape") {
                      setEditedTitle(metadata.title);
                      setIsRenamingTitle(false);
                    }
                  }}
                  autoFocus
                  className="font-bold text-gray-900 text-sm px-1 py-0.5 border border-emerald-500 rounded focus:outline-none"
                />
              ) : (
                <span
                  onClick={() => {
                    if (hasPermission(currentRole, "canEdit")) setIsRenamingTitle(true);
                  }}
                  title={hasPermission(currentRole, "canEdit") ? "Click to rename spreadsheet" : undefined}
                  className="font-bold text-gray-900 text-sm tracking-tight hover:bg-gray-100 px-1 py-0.5 rounded cursor-pointer transition truncate max-w-[320px]"
                >
                  {metadata.title}
                </span>
              )}

              {/* Star Button */}
              <button
                onClick={handleToggleStar}
                className="text-gray-400 hover:text-amber-500 p-0.5 transition"
                title={metadata.isStarred ? "Starred" : "Not starred"}
              >
                <Star
                  className={`w-4 h-4 ${
                    metadata.isStarred ? "fill-amber-400 text-amber-500" : ""
                  }`}
                />
              </button>

              {/* Client Workspace Badge */}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${currentWorkspace.badgeClass}`}>
                {currentWorkspace.name}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
              <span>Owner: {metadata.owner}</span>
              <span>•</span>
              <span className="font-mono text-[10px] text-gray-500">ID: {metadata.id}</span>
            </div>
          </div>
        </div>

        {/* Center View Switcher */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-medium">
          <button
            onClick={() => setActiveView("spreadsheet")}
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
            onClick={() => setActiveView("analytics")}
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
            onClick={() => setActiveView("api")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeView === "api"
                ? "bg-white text-emerald-700 shadow-sm font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ChatGPT API</span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Role Selector Badge */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
            <Shield className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as UserRole)}
              className="bg-transparent text-gray-800 font-semibold text-xs focus:outline-none cursor-pointer capitalize"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {/* GitHub Indicator */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition ${
              isGitHubConnected
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px] font-medium">
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
            onClick={() => setIsSettingsModalOpen(true)}
            title="Settings"
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Content */}
      {activeView === "spreadsheet" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <SpreadsheetToolbar
            currentRole={currentRole}
            onAddRow={handleAddRow}
            onDeleteSelected={handleDeleteSelected}
            selectedCount={selectedRowIds.size}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onOpenImport={() => setIsImportModalOpen(true)}
            onExportCsv={handleExportCsv}
            onRefresh={loadSpreadsheet}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            onManualSave={() => persistChanges(records)}
            visibleColumns={visibleColumns}
            onToggleColumn={(colKey) =>
              setVisibleColumns((prev) => ({ ...prev, [colKey]: !prev[colKey] }))
            }
            onOpenFilterModal={() => setIsFilterModalOpen(true)}
            isFiltered={isFiltered}
            onResetFilters={() => {
              setFilters({});
              setSearchQuery("");
            }}
          />

          {/* Formula Bar */}
          <FormulaBar
            activeCellCoord={activeCellCoord}
            activeCellValue={activeCellValue}
            activeColumnName={activeColumnName}
            onValueChange={setActiveCellValue}
            onCommit={() => {}}
            readOnly={!hasPermission(currentRole, "canEdit")}
          />

          {/* Grid */}
          <SpreadsheetGrid
            records={filteredAndSortedRecords}
            currentRole={currentRole}
            onUpdateCell={handleUpdateCell}
            selectedRowIds={selectedRowIds}
            onToggleSelectRow={(id) => {
              setSelectedRowIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onSelectAllRows={(selectAll) => {
              if (selectAll) {
                setSelectedRowIds(new Set(filteredAndSortedRecords.map((r) => r.id)));
              } else {
                setSelectedRowIds(new Set());
              }
            }}
            visibleColumns={visibleColumns}
            onActiveCellChange={(coord, val, colName) => {
              setActiveCellCoord(coord);
              setActiveCellValue(val);
              setActiveColumnName(colName);
            }}
            sortConfig={sortConfig}
            onSortChange={(col) => {
              setSortConfig((prev) => {
                if (prev.column === col) {
                  if (prev.direction === "asc") return { column: col, direction: "desc" };
                  if (prev.direction === "desc") return { column: null, direction: null };
                }
                return { column: col, direction: "asc" };
              });
            }}
            onBulkStatusChange={handleBulkStatusChange}
          />
        </div>
      )}

      {activeView === "analytics" && (
        <MetricsDashboard
          records={records}
          currentProject={{
            id: metadata.workspaceId,
            name: metadata.title,
            slug: metadata.workspaceId,
            website: currentWorkspace.website,
            description: metadata.description || currentWorkspace.description,
            filePath: `data/spreadsheets/${metadata.id}/backlinks.json`,
            color: currentWorkspace.color,
            badgeClass: currentWorkspace.badgeClass,
            targetAudience: currentWorkspace.description,
          }}
        />
      )}

      {activeView === "api" && (
        <ApiDocumentationView
          currentProject={{
            id: metadata.workspaceId,
            name: metadata.title,
            slug: metadata.workspaceId,
            website: currentWorkspace.website,
            description: metadata.description || currentWorkspace.description,
            filePath: `data/spreadsheets/${metadata.id}/backlinks.json`,
            color: currentWorkspace.color,
            badgeClass: currentWorkspace.badgeClass,
            targetAudience: currentWorkspace.description,
          }}
          customToken={customToken}
        />
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeProjectId={metadata.workspaceId}
        existingRecords={records}
        onConfirmImport={handleConfirmImport}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        currentProject={{
          id: metadata.workspaceId,
          name: metadata.title,
          slug: metadata.workspaceId,
          website: currentWorkspace.website,
          description: metadata.description || currentWorkspace.description,
          filePath: `data/spreadsheets/${metadata.id}/backlinks.json`,
          color: currentWorkspace.color,
          badgeClass: currentWorkspace.badgeClass,
          targetAudience: currentWorkspace.description,
        }}
        customToken={customToken}
        onSaveToken={(tok) => {
          setCustomToken(tok);
          if (tok) {
            localStorage.setItem("backlink_manager_gh_token", tok);
            setIsGitHubConnected(true);
          } else {
            localStorage.removeItem("backlink_manager_gh_token");
            setIsGitHubConnected(false);
          }
          loadSpreadsheet();
        }}
        isGitHubConnected={isGitHubConnected}
      />

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
        onResetFilters={() => setFilters({})}
      />
    </div>
  );
}
