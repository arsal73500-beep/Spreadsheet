"use client";

import React, { useState } from "react";
import { Plus, Table2, MapPin, Send, ChevronDown, ChevronUp } from "lucide-react";

interface TemplateGalleryProps {
  onSelectTemplate: (template: "blank" | "backlinks" | "citations" | "outreach", title: string) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const templates = [
    {
      id: "blank" as const,
      name: "Blank spreadsheet",
      desc: "Start fresh with default backlink schema",
      icon: (
        <div className="w-12 h-16 bg-white border border-gray-200 rounded-sm shadow-sm flex items-center justify-center group-hover:border-emerald-500 transition">
          <Plus className="w-8 h-8 text-emerald-600" />
        </div>
      ),
      defaultTitle: "Untitled spreadsheet",
    },
    {
      id: "backlinks" as const,
      name: "Backlink Tracker",
      desc: "Track status, DR, DA, traffic & anchors",
      icon: (
        <div className="w-12 h-16 bg-white border border-gray-200 rounded-sm shadow-sm p-1.5 flex flex-col justify-between group-hover:border-emerald-500 transition">
          <div className="h-2 w-full bg-emerald-500 rounded-xs" />
          <div className="space-y-1">
            <div className="h-1 w-full bg-gray-200 rounded-xs" />
            <div className="h-1 w-3/4 bg-gray-200 rounded-xs" />
            <div className="h-1 w-full bg-gray-200 rounded-xs" />
          </div>
          <Table2 className="w-3.5 h-3.5 text-emerald-600 self-end" />
        </div>
      ),
      defaultTitle: "New Backlink Tracker",
    },
    {
      id: "citations" as const,
      name: "Local Citations",
      desc: "Google Business, Bing, Yelp & directories",
      icon: (
        <div className="w-12 h-16 bg-white border border-gray-200 rounded-sm shadow-sm p-1.5 flex flex-col justify-between group-hover:border-blue-500 transition">
          <div className="h-2 w-full bg-blue-500 rounded-xs" />
          <div className="space-y-1">
            <div className="h-1 w-full bg-gray-200 rounded-xs" />
            <div className="h-1 w-4/5 bg-gray-200 rounded-xs" />
          </div>
          <MapPin className="w-3.5 h-3.5 text-blue-600 self-end" />
        </div>
      ),
      defaultTitle: "Local Citations Database",
    },
    {
      id: "outreach" as const,
      name: "Healthcare Outreach",
      desc: "Guest posts, medical forums & podcasts",
      icon: (
        <div className="w-12 h-16 bg-white border border-gray-200 rounded-sm shadow-sm p-1.5 flex flex-col justify-between group-hover:border-purple-500 transition">
          <div className="h-2 w-full bg-purple-500 rounded-xs" />
          <div className="space-y-1">
            <div className="h-1 w-full bg-gray-200 rounded-xs" />
            <div className="h-1 w-2/3 bg-gray-200 rounded-xs" />
          </div>
          <Send className="w-3.5 h-3.5 text-purple-600 self-end" />
        </div>
      ),
      defaultTitle: "Outreach & PR Opportunities",
    },
  ];

  return (
    <div className="bg-[#f1f3f4] border-b border-gray-300 py-4 px-6 select-none transition-all">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-gray-700">Start a new spreadsheet</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-[11px]"
          >
            <span>{isExpanded ? "Hide templates" : "Template gallery"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => onSelectTemplate(tmpl.id, tmpl.defaultTitle)}
                className="group cursor-pointer flex flex-col items-center p-3 rounded-xl bg-transparent hover:bg-gray-200/60 transition"
              >
                <div className="w-full aspect-[4/3] bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-center group-hover:shadow-md transition">
                  {tmpl.icon}
                </div>
                <div className="mt-2 text-center w-full">
                  <p className="text-xs font-semibold text-gray-800 group-hover:text-emerald-700 truncate">
                    {tmpl.name}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">{tmpl.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
