"use client";

import React, { useState } from "react";
import {
  Code2,
  Terminal,
  Send,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { ProjectConfig } from "@/lib/projects-config";

interface ApiDocumentationViewProps {
  currentProject: ProjectConfig;
  customToken?: string;
}

export const ApiDocumentationView: React.FC<ApiDocumentationViewProps> = ({
  currentProject,
  customToken,
}) => {
  const [testDomain, setTestDomain] = useState("searchengineland.com");
  const [testDr, setTestDr] = useState(88);
  const [testDa, setTestDa] = useState(82);
  const [testTraffic, setTestTraffic] = useState(450000);
  const [testCategory, setTestCategory] = useState("Guest Post");
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleTestResearchApi = async () => {
    setIsLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "admin",
          ...(customToken ? { "x-github-token": customToken } : {}),
        },
        body: JSON.stringify({
          domain: testDomain,
          backlinkUrl: `https://${testDomain}/article-test`,
          dr: Number(testDr),
          da: Number(testDa),
          organicTraffic: Number(testTraffic),
          category: testCategory,
          notes: "Auto-discovered via ChatGPT SEO Research integration test",
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gray-50 p-6 space-y-6 text-xs">
      {/* Overview Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              ChatGPT & Automated SEO Integration APIs
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
              RESTful v1
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Automate backlink research, metric enrichment (Ahrefs DR, Moz DA), and submission tracking directly into GitHub repository storage for <strong>{currentProject.name}</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Endpoint Tester */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-600" />
              <span>Live API Tester: /api/projects/{currentProject.id}/research</span>
            </h2>
            <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              POST
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Target Research Domain</label>
              <input
                type="text"
                value={testDomain}
                onChange={(e) => setTestDomain(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Ahrefs DR (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={testDr}
                  onChange={(e) => setTestDr(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Moz DA (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={testDa}
                  onChange={(e) => setTestDa(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Organic Traffic</label>
                <input
                  type="number"
                  value={testTraffic}
                  onChange={(e) => setTestTraffic(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Opportunity Category</label>
              <input
                type="text"
                value={testCategory}
                onChange={(e) => setTestCategory(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs"
              />
            </div>

            <button
              onClick={handleTestResearchApi}
              disabled={isLoading}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded font-medium flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              {isLoading ? (
                <span>Executing API Request...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Research Request to {currentProject.name}</span>
                </>
              )}
            </button>
          </div>

          {testResult && (
            <div className="mt-4 p-3 bg-gray-900 text-gray-100 rounded-lg font-mono text-[11px] overflow-x-auto max-h-56">
              <div className="flex items-center justify-between pb-1 border-b border-gray-700 text-gray-400 mb-2">
                <span>Response Payload:</span>
                <span className={testResult.success ? "text-emerald-400" : "text-rose-400"}>
                  {testResult.success ? "200 OK" : "Error"}
                </span>
              </div>
              <pre>{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* API Specification & Code Snippets */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gray-800" />
              <span>cURL Integration Snippet</span>
            </h2>
            <div className="relative">
              <pre className="p-3 bg-gray-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`curl -X POST https://your-backlink-manager.vercel.app/api/projects/${currentProject.id}/research \\
  -H "Content-Type: application/json" \\
  -H "x-user-role: admin" \\
  -d '{
    "domain": "techcrunch.com",
    "backlinkUrl": "https://techcrunch.com/article-feature",
    "dr": 92,
    "da": 89,
    "organicTraffic": 2100000,
    "category": "Guest Post",
    "notes": "Added automatically via ChatGPT crawler"
  }'`}
              </pre>
              <button
                onClick={() =>
                  copyToClipboard(
                    `curl -X POST /api/projects/${currentProject.id}/research -H "Content-Type: application/json" -d '{"domain":"techcrunch.com","dr":92,"da":89}'`,
                    1
                  )
                }
                className="absolute top-2 right-2 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded"
              >
                {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Endpoints Reference List */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Available Project REST Endpoints</span>
            </h2>

            <div className="space-y-2 text-[11px]">
              {[
                { method: "GET", path: "/api/projects", desc: "List all projects with isolated metrics" },
                { method: "GET", path: `/api/projects/${currentProject.id}/backlinks`, desc: "Fetch project backlinks & repository SHA" },
                { method: "POST", path: `/api/projects/${currentProject.id}/backlinks`, desc: "Add single backlink with validation" },
                { method: "PATCH", path: `/api/projects/${currentProject.id}/backlinks/[id]`, desc: "Update backlink cell or row" },
                { method: "DELETE", path: `/api/projects/${currentProject.id}/backlinks/[id]`, desc: "Delete backlink from repository" },
                { method: "POST", path: `/api/projects/${currentProject.id}/backlinks/bulk`, desc: "Spreadsheet batch sync & CSV import" },
                { method: "POST", path: `/api/projects/${currentProject.id}/research`, desc: "ChatGPT domain research & metrics enrichment" },
                { method: "GET", path: `/api/projects/${currentProject.id}/history`, desc: "GitHub file commit history & rollback log" },
              ].map((ep, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ep.method === "GET"
                          ? "bg-blue-100 text-blue-800"
                          : ep.method === "POST"
                          ? "bg-emerald-100 text-emerald-800"
                          : ep.method === "PATCH"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-gray-800">{ep.path}</span>
                  </div>
                  <span className="text-gray-500 text-[10px]">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
