"use client";

import React, { useMemo } from "react";
import { BacklinkRecord } from "@/lib/schema";
import { ProjectConfig } from "@/lib/projects-config";
import {
  Link2,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  AlertTriangle,
  Globe2,
  TrendingUp,
  Award,
  Layers,
  PieChart,
} from "lucide-react";

interface MetricsDashboardProps {
  records: BacklinkRecord[];
  currentProject: ProjectConfig;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  records,
  currentProject,
}) => {
  const stats = useMemo(() => {
    const total = records.length;
    const live = records.filter((r) => r.status === "Live").length;
    const pending = records.filter((r) => r.status === "Pending").length;
    const submitted = records.filter((r) => r.status === "Submitted").length;
    const rejected = records.filter((r) => r.status === "Rejected").length;
    const broken = records.filter(
      (r) => r.status === "Broken" || r.status === "Missing"
    ).length;

    const domains = new Set(
      records.map((r) => r.domain.toLowerCase().trim()).filter(Boolean)
    );

    const validDrs = records.map((r) => r.dr).filter((dr) => dr > 0);
    const avgDr =
      validDrs.length > 0
        ? Math.round(validDrs.reduce((a, b) => a + b, 0) / validDrs.length)
        : 0;

    const validDas = records.map((r) => r.da).filter((da) => da > 0);
    const avgDa =
      validDas.length > 0
        ? Math.round(validDas.reduce((a, b) => a + b, 0) / validDas.length)
        : 0;

    const totalTraffic = records.reduce((sum, r) => sum + (r.organicTraffic || 0), 0);

    // Category breakdown
    const categories: Record<string, number> = {};
    records.forEach((r) => {
      categories[r.category] = (categories[r.category] || 0) + 1;
    });

    // Anchor breakdown
    const anchors: Record<string, number> = {};
    records.forEach((r) => {
      anchors[r.anchorCategory] = (anchors[r.anchorCategory] || 0) + 1;
    });

    // Link Type breakdown
    const linkTypes: Record<string, number> = {};
    records.forEach((r) => {
      linkTypes[r.linkType] = (linkTypes[r.linkType] || 0) + 1;
    });

    return {
      total,
      live,
      pending,
      submitted,
      rejected,
      broken,
      uniqueDomains: domains.size,
      avgDr,
      avgDa,
      totalTraffic,
      categories,
      anchors,
      linkTypes,
    };
  }, [records]);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gray-50 p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              {currentProject.name} — SEO Performance & Backlinks
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
              Live Tracker
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            {currentProject.description} • Targeted Audience: {currentProject.targetAudience}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400 block">Repository Data File</span>
          <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded border">
            {currentProject.filePath}
          </span>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Total Backlinks</span>
            <Link2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <span className="text-[10px] text-gray-400 mt-1 block">Active repository entries</span>
        </div>

        {/* Live */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Live Backlinks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.live}</div>
          <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
            {stats.total > 0 ? `${Math.round((stats.live / stats.total) * 100)}% active rate` : "0%"}
          </span>
        </div>

        {/* Submitted */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Submitted</span>
            <Send className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
          <span className="text-[10px] text-gray-400 mt-1 block">Awaiting indexing</span>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <span className="text-[10px] text-gray-400 mt-1 block">Outreach pipeline</span>
        </div>

        {/* Referring Domains */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Referring Domains</span>
            <Globe2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{stats.uniqueDomains}</div>
          <span className="text-[10px] text-gray-400 mt-1 block">Unique root domains</span>
        </div>

        {/* Avg DR / DA */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Avg DR / DA</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-900">
            {stats.avgDr} <span className="text-xs text-gray-400 font-normal">DR</span> /{" "}
            {stats.avgDa} <span className="text-xs text-gray-400 font-normal">DA</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">Ahrefs & Moz metrics</span>
        </div>
      </div>

      {/* Breakdown Charts & Tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category Distribution */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Category Distribution</span>
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.categories).length === 0 ? (
              <p className="text-xs text-gray-400">No categories recorded.</p>
            ) : (
              Object.entries(stats.categories)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => {
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-700">
                        <span className="truncate">{cat}</span>
                        <span className="font-mono font-medium">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Anchor Text Categories */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-600" />
            <span>Anchor Text Profile</span>
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.anchors).length === 0 ? (
              <p className="text-xs text-gray-400">No anchor categories recorded.</p>
            ) : (
              Object.entries(stats.anchors)
                .sort((a, b) => b[1] - a[1])
                .map(([anchor, count]) => {
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={anchor} className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-700">
                        <span className="truncate">{anchor}</span>
                        <span className="font-mono font-medium">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Link Type & Status Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>Link Attributes & Health</span>
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <span className="text-[11px] font-bold uppercase text-gray-500">
                Dofollow vs Nofollow
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">
                  Dofollow: {stats.linkTypes["Dofollow"] || 0}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs font-medium text-gray-700">
                  Nofollow: {stats.linkTypes["Nofollow"] || 0}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs font-medium text-gray-700">
                  Other: {(stats.linkTypes["Sponsored"] || 0) + (stats.linkTypes["UGC"] || 0)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <span className="text-[11px] font-bold uppercase text-gray-500">
                Estimated Cumulative Organic Traffic
              </span>
              <div className="text-lg font-bold text-gray-900 font-mono">
                {stats.totalTraffic.toLocaleString()} <span className="text-xs font-normal text-gray-500">visits/mo</span>
              </div>
            </div>

            {stats.broken > 0 && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{stats.broken}</strong> broken/missing link(s) require attention.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
