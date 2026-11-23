"use client";

import React from "react";
import { PROJECTS, ProjectConfig } from "@/lib/projects-config";
import { Plus, Database, FileSpreadsheet } from "lucide-react";

interface ProjectTabsProps {
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  recordCounts: Record<string, number>;
}

export const ProjectTabs: React.FC<ProjectTabsProps> = ({
  activeProjectId,
  onSelectProject,
  recordCounts,
}) => {
  return (
    <div className="bg-[#f1f3f4] border-b border-gray-300 px-3 pt-1 flex items-center justify-between select-none shrink-0 overflow-x-auto">
      <div className="flex items-center gap-1">
        {Object.values(PROJECTS).map((proj) => {
          const isActive = proj.id === activeProjectId;
          const count = recordCounts[proj.id] ?? 0;

          return (
            <button
              key={proj.id}
              onClick={() => onSelectProject(proj.id)}
              className={`group flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-t-md border-t border-l border-r transition relative ${
                isActive
                  ? "bg-white text-gray-900 border-gray-300 font-semibold shadow-sm z-10"
                  : "bg-[#e8eaed] text-gray-600 border-transparent hover:bg-[#dfe1e5] hover:text-gray-800"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: proj.color }}
              />
              <span className="truncate max-w-[150px]">{proj.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800 font-bold"
                    : "bg-gray-300 text-gray-700"
                }`}
              >
                {count}
              </span>

              {/* Bottom active green border line */}
              {isActive && (
                <div
                  className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-emerald-600"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Target File Indicator */}
      <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-500 pr-2">
        <Database className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-mono text-gray-600">
          {PROJECTS[activeProjectId]?.filePath}
        </span>
      </div>
    </div>
  );
};
