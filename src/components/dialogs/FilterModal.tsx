"use client";

import React from "react";
import { X, Filter, RotateCcw, Check } from "lucide-react";
import {
  STATUS_OPTIONS,
  CATEGORY_OPTIONS,
  ANCHOR_CATEGORY_OPTIONS,
  LINK_TYPE_OPTIONS,
} from "@/lib/schema";

export interface FilterState {
  status?: string;
  category?: string;
  domain?: string;
  minDr?: number;
  maxDr?: number;
  minDa?: number;
  maxDa?: number;
  minTraffic?: number;
  anchorCategory?: string;
  linkType?: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
}) => {
  const [localFilters, setLocalFilters] = React.useState<FilterState>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: keyof FilterState, val: any) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: val === "" ? undefined : val,
    }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
    onResetFilters();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Filter Spreadsheet Records</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Domain Filter */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Domain Contains</label>
            <input
              type="text"
              value={localFilters.domain || ""}
              onChange={(e) => handleChange("domain", e.target.value)}
              placeholder="e.g. medical, pak, .org"
              className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Status & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Status</label>
              <select
                value={localFilters.status || ""}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Category</label>
              <select
                value={localFilters.category || ""}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DR Range */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Domain Rating (DR) Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                max="100"
                value={localFilters.minDr ?? ""}
                onChange={(e) => handleChange("minDr", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Min DR (0)"
                className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={localFilters.maxDr ?? ""}
                onChange={(e) => handleChange("maxDr", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Max DR (100)"
                className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* DA Range */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Domain Authority (DA) Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                max="100"
                value={localFilters.minDa ?? ""}
                onChange={(e) => handleChange("minDa", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Min DA (0)"
                className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={localFilters.maxDa ?? ""}
                onChange={(e) => handleChange("maxDa", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Max DA (100)"
                className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Traffic */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Minimum Organic Traffic
            </label>
            <input
              type="number"
              min="0"
              value={localFilters.minTraffic ?? ""}
              onChange={(e) => handleChange("minTraffic", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 5000"
              className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Anchor Category & Link Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Anchor Category</label>
              <select
                value={localFilters.anchorCategory || ""}
                onChange={(e) => handleChange("anchorCategory", e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">All Anchors</option>
                {ANCHOR_CATEGORY_OPTIONS.map((anc) => (
                  <option key={anc} value={anc}>
                    {anc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Link Type</label>
              <select
                value={localFilters.linkType || ""}
                onChange={(e) => handleChange("linkType", e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">All Types</option>
                {LINK_TYPE_OPTIONS.map((lt) => (
                  <option key={lt} value={lt}>
                    {lt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
