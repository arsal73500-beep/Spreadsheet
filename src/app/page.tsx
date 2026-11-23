"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SpreadsheetHomeNav } from "@/components/dashboard-home/SpreadsheetHomeNav";
import { TemplateGallery } from "@/components/dashboard-home/TemplateGallery";
import { SpreadsheetList } from "@/components/dashboard-home/SpreadsheetList";
import { CreateSpreadsheetModal } from "@/components/dialogs/CreateSpreadsheetModal";
import { RenameSpreadsheetModal } from "@/components/dialogs/RenameSpreadsheetModal";
import { DeleteSpreadsheetModal } from "@/components/dialogs/DeleteSpreadsheetModal";
import { SettingsModal } from "@/components/dialogs/SettingsModal";
import { SpreadsheetMetadata, WORKSPACES } from "@/lib/spreadsheet-schema";
import { UserRole } from "@/lib/auth";

export default function SpreadsheetHomePage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Role derived strictly from verified session
  const currentRole: UserRole = (session?.user?.role as UserRole) || "viewer";

  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeWorkspace, setActiveWorkspace] = useState("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "recent" | "starred" | "archived">("all");

  // GitHub state
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [customToken, setCustomToken] = useState("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createInitialTemplate, setCreateInitialTemplate] = useState<"blank" | "backlinks" | "citations" | "outreach">("blank");
  const [createInitialTitle, setCreateInitialTitle] = useState("");
  const [selectedSheetForRename, setSelectedSheetForRename] = useState<SpreadsheetMetadata | null>(null);
  const [selectedSheetForDelete, setSelectedSheetForDelete] = useState<SpreadsheetMetadata | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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

  const fetchSpreadsheets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeWorkspace !== "all") params.append("workspaceId", activeWorkspace);
      if (activeFilter === "starred") params.append("starred", "true");
      if (activeFilter === "archived") params.append("archived", "true");
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (activeFilter === "recent") params.append("sortBy", "updatedAt");

      const res = await fetch(`/api/spreadsheets?${params.toString()}`);
      const data = await res.json();
      if (data.spreadsheets) {
        setSpreadsheets(data.spreadsheets);
      }
    } catch (err) {
      console.warn("Failed loading spreadsheets:", err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, activeFilter, searchQuery]);

  useEffect(() => {
    fetchSpreadsheets();
  }, [fetchSpreadsheets]);

  // Create spreadsheet handler
  const handleCreateSpreadsheet = async (data: {
    title: string;
    workspaceId: string;
    description: string;
    template: "blank" | "backlinks" | "citations" | "outreach";
  }) => {
    const res = await fetch("/api/spreadsheets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(customToken ? { "x-github-token": customToken } : {}),
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to create spreadsheet.");
    }

    // Direct redirect to new spreadsheet editor
    router.push(`/sheets/${result.spreadsheet.id}`);
  };

  // Star Toggle
  const handleStarToggle = async (id: string, isStarred: boolean) => {
    setSpreadsheets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isStarred } : s))
    );

    try {
      await fetch(`/api/spreadsheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred }),
      });
    } catch {
      fetchSpreadsheets();
    }
  };

  // Rename
  const handleRename = async (id: string, newTitle: string) => {
    const res = await fetch(`/api/spreadsheets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to rename spreadsheet.");
    }
    fetchSpreadsheets();
  };

  // Duplicate
  const handleDuplicate = async (sheet: SpreadsheetMetadata) => {
    try {
      const res = await fetch(`/api/spreadsheets/${sheet.id}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(customToken ? { "x-github-token": customToken } : {}),
        },
        body: JSON.stringify({ title: `${sheet.title} (Copy)` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to duplicate.");
      fetchSpreadsheets();
      router.push(`/sheets/${data.spreadsheet.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to duplicate spreadsheet.");
    }
  };

  // Archive / Restore
  const handleToggleArchive = async (sheet: SpreadsheetMetadata) => {
    const isArchived = !sheet.isArchived;
    try {
      await fetch(`/api/spreadsheets/${sheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived }),
      });
      fetchSpreadsheets();
    } catch {
      fetchSpreadsheets();
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/spreadsheets/${id}`, {
      method: "DELETE",
      headers: {
        ...(customToken ? { "x-github-token": customToken } : {}),
      },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete spreadsheet.");
    }
    fetchSpreadsheets();
  };

  // Template select trigger
  const handleSelectTemplate = (
    template: "blank" | "backlinks" | "citations" | "outreach",
    title: string
  ) => {
    setCreateInitialTemplate(template);
    setCreateInitialTitle(title);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden select-none">
      {/* 1. Google Sheets Home Header */}
      <SpreadsheetHomeNav
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentRole={currentRole}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isGitHubConnected={isGitHubConnected}
        onNewSpreadsheet={() => {
          setCreateInitialTemplate("blank");
          setCreateInitialTitle("Untitled spreadsheet");
          setIsCreateModalOpen(true);
        }}
      />

      {/* 2. Google Sheets Template Gallery Banner */}
      <TemplateGallery onSelectTemplate={handleSelectTemplate} />

      {/* 3. Main Spreadsheets List / Grid */}
      <SpreadsheetList
        spreadsheets={spreadsheets}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        currentRole={currentRole}
        onStarToggle={handleStarToggle}
        onOpenRename={(s) => setSelectedSheetForRename(s)}
        onOpenDuplicate={handleDuplicate}
        onToggleArchive={handleToggleArchive}
        onOpenDelete={(s) => setSelectedSheetForDelete(s)}
      />

      {/* Create Modal */}
      <CreateSpreadsheetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialTemplate={createInitialTemplate}
        initialTitle={createInitialTitle}
        defaultWorkspaceId={activeWorkspace}
        onCreate={handleCreateSpreadsheet}
      />

      {/* Rename Modal */}
      <RenameSpreadsheetModal
        isOpen={Boolean(selectedSheetForRename)}
        onClose={() => setSelectedSheetForRename(null)}
        spreadsheet={selectedSheetForRename}
        onRename={handleRename}
      />

      {/* Delete Modal */}
      <DeleteSpreadsheetModal
        isOpen={Boolean(selectedSheetForDelete)}
        onClose={() => setSelectedSheetForDelete(null)}
        spreadsheet={selectedSheetForDelete}
        onDelete={handleDelete}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentRole={currentRole}
        currentProject={{
          id: activeWorkspace === "all" ? "md-health-center" : activeWorkspace,
          name: WORKSPACES[activeWorkspace]?.name || "MD Health Center",
          slug: activeWorkspace,
          website: WORKSPACES[activeWorkspace]?.website || "",
          description: WORKSPACES[activeWorkspace]?.description || "Client Workspace",
          filePath: `data/spreadsheets/`,
          color: WORKSPACES[activeWorkspace]?.color || "#0f9d58",
          badgeClass: WORKSPACES[activeWorkspace]?.badgeClass || "",
          targetAudience: "Backlink research and outreach",
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
          fetchSpreadsheets();
        }}
        isGitHubConnected={isGitHubConnected}
      />
    </div>
  );
}
