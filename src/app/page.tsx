"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { ProjectTabs } from "@/components/navigation/ProjectTabs";
import { SpreadsheetToolbar } from "@/components/spreadsheet/SpreadsheetToolbar";
import { FormulaBar } from "@/components/spreadsheet/FormulaBar";
import { SpreadsheetGrid, COLUMNS } from "@/components/spreadsheet/SpreadsheetGrid";
import { CsvImportModal } from "@/components/dialogs/CsvImportModal";
import { SettingsModal } from "@/components/dialogs/SettingsModal";
import { FilterModal, FilterState } from "@/components/dialogs/FilterModal";
import { MetricsDashboard } from "@/components/dashboard/MetricsDashboard";
import { ApiDocumentationView } from "@/components/api-docs/ApiDocumentationView";
import { PROJECTS, DEFAULT_PROJECT_ID, getProjectConfig } from "@/lib/projects-config";
import { BacklinkRecord, createEmptyBacklink, BacklinkStatus } from "@/lib/schema";
import { UserRole, hasPermission } from "@/lib/auth";
import { exportBacklinksToCsv } from "@/lib/csv-parser";

export default function BacklinkManagerPage() {
  const [activeProjectId, setActiveProjectId] = useState<string>(DEFAULT_PROJECT_ID);
  const [activeView, setActiveView] = useState<"spreadsheet" | "analytics" | "api">("spreadsheet");
  const [currentRole, setCurrentRole] = useState<UserRole>("admin");
  const [records, setRecords] = useState<BacklinkRecord[]>([]);
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});
  const [baseSha, setBaseSha] = useState<string>("");
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

  // Debounced Auto-Save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load token from localStorage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("backlink_manager_gh_token");
      if (stored) {
        setCustomToken(stored);
        setIsGitHubConnected(true);
      }
    }
  }, []);

  const handleSaveToken = (token: string) => {
    setCustomToken(token);
    if (token) {
      localStorage.setItem("backlink_manager_gh_token", token);
      setIsGitHubConnected(true);
    } else {
      localStorage.removeItem("backlink_manager_gh_token");
      setIsGitHubConnected(false);
    }
    // Reload project data with updated token
    loadProjectData(activeProjectId, token);
  };

  // Load project backlinks
  const loadProjectData = useCallback(async (projId: string, tokenOverride?: string) => {
    try {
      const headers: Record<string, string> = {
        "x-user-role": currentRole,
      };
      const token = tokenOverride !== undefined ? tokenOverride : customToken;
      if (token) headers["x-github-token"] = token;

      const res = await fetch(`/api/projects/${projId}/backlinks`, { headers });
      const data = await res.json();

      if (data.records) {
        setRecords(data.records);
        setBaseSha(data.sha || "");
        setIsGitHubConnected(data.source === "github" || Boolean(token));
        setSaveStatus("saved");
        setLastSavedAt(data.lastModified || new Date().toISOString());

        // Update counts
        setRecordCounts((prev) => ({
          ...prev,
          [projId]: data.records.length,
        }));

        // Reset undo/redo on project switch
        setUndoStack([]);
        setRedoStack([]);
        setSelectedRowIds(new Set());
      }
    } catch (err) {
      console.error("Failed to load project records", err);
      setSaveStatus("error");
    }
  }, [currentRole, customToken]);

  // Initial load and on project change
  useEffect(() => {
    loadProjectData(activeProjectId);
  }, [activeProjectId, loadProjectData]);

  // Load all project summary counts
  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects) {
          const counts: Record<string, number> = {};
          data.projects.forEach((p: any) => {
            counts[p.id] = p.totalBacklinks || 0;
          });
          setRecordCounts(counts);
        }
      })
      .catch((err) => console.warn("Could not load summary counts", err));
  }, []);

  // Save changes to server / GitHub
  const persistChanges = useCallback(
    async (recordsToSave: BacklinkRecord[], commitMsg?: string) => {
      setSaveStatus("saving");
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "x-user-role": currentRole,
        };
        if (customToken) headers["x-github-token"] = customToken;

        const res = await fetch(`/api/projects/${activeProjectId}/backlinks/bulk`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            records: recordsToSave,
            baseSha,
            commitMessage:
              commitMsg ||
              `chore(backlinks): update ${activeProjectId} records [${recordsToSave.length} total]`,
            mode: "replace",
          }),
        });

        const result = await res.json();

        if (res.status === 409 || result.conflict) {
          setSaveStatus("conflict");
          alert(
            "Conflict detected: The GitHub repository was updated remotely. Please refresh to fetch the latest changes before overwriting."
          );
          return;
        }

        if (!res.ok) {
          throw new Error(result.error || "Save failed");
        }

        setBaseSha(result.sha);
        setSaveStatus("saved");
        setLastSavedAt(new Date().toISOString());
        setRecordCounts((prev) => ({
          ...prev,
          [activeProjectId]: recordsToSave.length,
        }));
      } catch (err: any) {
        console.error("Failed to persist changes:", err);
        setSaveStatus("error");
      }
    },
    [activeProjectId, baseSha, currentRole, customToken]
  );

  // Trigger debounced autosave when records change
  const triggerAutoSave = useCallback(
    (newRecords: BacklinkRecord[]) => {
      setSaveStatus("unsaved");
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        persistChanges(newRecords);
      }, 2000);
    },
    [persistChanges]
  );

  // Update a single cell
  const handleUpdateCell = useCallback(
    (recordId: string, field: keyof BacklinkRecord, value: any) => {
      if (!hasPermission(currentRole, "canEdit")) {
        alert("You do not have permission to edit records in this role.");
        return;
      }

      setRecords((prevRecords) => {
        const targetIndex = prevRecords.findIndex((r) => r.id === recordId);
        if (targetIndex === -1) return prevRecords;

        // Save current to undo stack
        setUndoStack((u) => [...u, prevRecords]);
        setRedoStack([]); // Clear redo

        const updated = [...prevRecords];
        updated[targetIndex] = {
          ...updated[targetIndex],
          [field]: value,
        };

        triggerAutoSave(updated);
        return updated;
      });
    },
    [currentRole, triggerAutoSave]
  );

  // Add new row
  const handleAddRow = () => {
    if (!hasPermission(currentRole, "canAdd")) return;
    const newRow = createEmptyBacklink();
    setUndoStack((u) => [...u, records]);
    setRedoStack([]);

    const updated = [newRow, ...records];
    setRecords(updated);
    triggerAutoSave(updated);
  };

  // Delete selected rows
  const handleDeleteSelected = () => {
    if (!hasPermission(currentRole, "canDelete")) {
      alert("Only Administrators are permitted to delete records.");
      return;
    }
    if (selectedRowIds.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedRowIds.size} backlink record(s)? This will commit the deletion to GitHub.`
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

  // Bulk status update
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
    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);

    setRedoStack((r) => [...r, records]);
    setUndoStack(newUndo);
    setRecords(previous);
    triggerAutoSave(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);

    setUndoStack((u) => [...u, records]);
    setRedoStack(newRedo);
    setRecords(next);
    triggerAutoSave(next);
  };

  // Sorting
  const handleSortChange = (column: keyof BacklinkRecord) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        if (prev.direction === "asc") return { column, direction: "desc" };
        if (prev.direction === "desc") return { column: null, direction: null };
      }
      return { column, direction: "asc" };
    });
  };

  // CSV Import handler
  const handleConfirmImport = async (
    importedRecords: BacklinkRecord[],
    targetProjectId: string
  ) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-user-role": currentRole,
    };
    if (customToken) headers["x-github-token"] = customToken;

    const res = await fetch(`/api/projects/${targetProjectId}/backlinks/bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        records: importedRecords,
        mode: "append",
        commitMessage: `feat(import): imported ${importedRecords.length} records into ${targetProjectId}`,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to commit imported records");
    }

    // Refresh current project if same
    if (targetProjectId === activeProjectId) {
      loadProjectData(activeProjectId);
    } else {
      // Switch to that project to view newly imported records
      setActiveProjectId(targetProjectId);
    }
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const proj = getProjectConfig(activeProjectId);
    const csvString = exportBacklinksToCsv(filteredAndSortedRecords, proj.name);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${proj.slug}-backlinks-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Sort processed records
  const filteredAndSortedRecords = useMemo(() => {
    let list = [...records];

    // Global Search
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

    // Advanced Filters
    if (filters.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters.category) {
      list = list.filter((r) => r.category === filters.category);
    }
    if (filters.domain) {
      list = list.filter((r) => r.domain.toLowerCase().includes(filters.domain!.toLowerCase()));
    }
    if (filters.minDr !== undefined) {
      list = list.filter((r) => r.dr >= filters.minDr!);
    }
    if (filters.maxDr !== undefined) {
      list = list.filter((r) => r.dr <= filters.maxDr!);
    }
    if (filters.minDa !== undefined) {
      list = list.filter((r) => r.da >= filters.minDa!);
    }
    if (filters.maxDa !== undefined) {
      list = list.filter((r) => r.da <= filters.maxDa!);
    }
    if (filters.minTraffic !== undefined) {
      list = list.filter((r) => r.organicTraffic >= filters.minTraffic!);
    }
    if (filters.anchorCategory) {
      list = list.filter((r) => r.anchorCategory === filters.anchorCategory);
    }
    if (filters.linkType) {
      list = list.filter((r) => r.linkType === filters.linkType);
    }

    // Sort
    if (sortConfig.column && sortConfig.direction) {
      const col = sortConfig.column;
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      list.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === "number" && typeof valB === "number") {
          return (valA - valB) * dir;
        }
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

  const currentProject = getProjectConfig(activeProjectId);

  return (
    <div className="h-full w-full flex flex-col bg-[#f8f9fa] overflow-hidden select-none">
      {/* 1. Top Navigation Bar */}
      <TopNav
        currentProject={currentProject}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        activeView={activeView}
        onViewChange={setActiveView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isGitHubConnected={isGitHubConnected}
        saveStatus={saveStatus}
        onManualSave={() => persistChanges(records)}
      />

      {/* 2. Project Tabs */}
      <ProjectTabs
        activeProjectId={activeProjectId}
        onSelectProject={(id) => {
          if (id !== activeProjectId) {
            setActiveProjectId(id);
          }
        }}
        recordCounts={recordCounts}
      />

      {/* 3. Main Views */}
      {activeView === "spreadsheet" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Spreadsheet Toolbar */}
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
            onRefresh={() => loadProjectData(activeProjectId)}
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

          {/* Google Sheets Formula Bar */}
          <FormulaBar
            activeCellCoord={activeCellCoord}
            activeCellValue={activeCellValue}
            activeColumnName={activeColumnName}
            onValueChange={setActiveCellValue}
            onCommit={() => {
              // Could update active cell from formula bar
            }}
            readOnly={!hasPermission(currentRole, "canEdit")}
          />

          {/* The Spreadsheet Grid */}
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
            onSortChange={handleSortChange}
            onBulkStatusChange={handleBulkStatusChange}
          />
        </div>
      )}

      {activeView === "analytics" && (
        <MetricsDashboard records={records} currentProject={currentProject} />
      )}

      {activeView === "api" && (
        <ApiDocumentationView currentProject={currentProject} customToken={customToken} />
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeProjectId={activeProjectId}
        existingRecords={records}
        onConfirmImport={handleConfirmImport}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        currentProject={currentProject}
        customToken={customToken}
        onSaveToken={handleSaveToken}
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
