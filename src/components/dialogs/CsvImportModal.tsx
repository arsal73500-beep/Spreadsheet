"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  parseCsvFile,
  detectColumnMapping,
  processImportRows,
  ColumnMapping,
  ImportValidationResult,
} from "@/lib/csv-parser";
import { PROJECTS } from "@/lib/projects-config";
import { BacklinkRecord } from "@/lib/schema";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId: string;
  existingRecords: BacklinkRecord[];
  onConfirmImport: (records: BacklinkRecord[], targetProjectId: string) => Promise<void>;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  activeProjectId,
  existingRecords,
  onConfirmImport,
}) => {
  const [targetProject, setTargetProject] = useState(activeProjectId);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    setFileName(file.name);
    setCsvFile(file);

    try {
      const text = await file.text();
      const parsed = await parseCsvFile(text);

      if (parsed.headers.length === 0 || parsed.rawRows.length === 0) {
        setErrorMsg("The CSV file is empty or missing header rows.");
        return;
      }

      setHeaders(parsed.headers);
      setRawRows(parsed.rawRows);
      setMapping(parsed.suggestedMapping);
      setStep("mapping");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse CSV file.");
    }
  };

  const handleValidateMapping = () => {
    setErrorMsg("");
    const result = processImportRows(rawRows, mapping, existingRecords);

    if (result.validRecords.length === 0 && result.duplicates.length === 0) {
      setErrorMsg("No valid records could be processed. Please check your column mappings.");
      return;
    }

    setValidationResult(result);
    setStep("preview");
  };

  const handleCommit = async () => {
    if (!validationResult || validationResult.validRecords.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirmImport(validationResult.validRecords, targetProject);
      onClose();
      // Reset state
      setStep("upload");
      setCsvFile(null);
      setValidationResult(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to import records.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              <span>Import Backlinks from CSV</span>
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Migrate existing Google Sheets trackers with column mapping & duplicate prevention.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Project Isolation Selector */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-800 block text-xs">
                Target Project (Isolated Storage):
              </span>
              <span className="text-gray-500 text-[11px]">
                Imported backlinks will strictly be saved into this project's repository file.
              </span>
            </div>
            <select
              value={targetProject}
              onChange={(e) => setTargetProject(e.target.value)}
              className="bg-white border border-gray-300 rounded px-3 py-1.5 font-medium text-xs text-gray-800 focus:ring-1 focus:ring-emerald-500"
            >
              {Object.values(PROJECTS).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.filePath})
                </option>
              ))}
            </select>
          </div>

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition cursor-pointer relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <p className="font-medium text-gray-800 text-sm">
                Drop your Google Sheets CSV export here, or click to browse
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Supports CSV exported from Google Sheets, Excel, or custom backlink trackers
              </p>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="font-bold text-gray-900">
                  Step 2: Map CSV Columns to Backlink Schema
                </span>
                <span className="text-gray-500 text-[11px]">
                  Loaded {rawRows.length} rows from <span className="font-mono text-gray-700">{fileName}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: "backlinkUrl", label: "Backlink URL", required: true },
                  { key: "domain", label: "Domain", required: false },
                  { key: "status", label: "Status", required: false },
                  { key: "category", label: "Category", required: false },
                  { key: "dr", label: "Domain Rating (DR)", required: false },
                  { key: "da", label: "Domain Authority (DA)", required: false },
                  { key: "organicTraffic", label: "Organic Traffic", required: false },
                  { key: "anchorText", label: "Anchor Text", required: false },
                  { key: "anchorCategory", label: "Anchor Category", required: false },
                  { key: "linkType", label: "Link Type (Dofollow/Nofollow)", required: false },
                  { key: "account", label: "Submission Account / Email", required: false },
                  { key: "submissionUrl", label: "Submission URL", required: false },
                  { key: "dateAdded", label: "Date Added", required: false },
                  { key: "notes", label: "Notes / Comments", required: false },
                ].map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-200"
                  >
                    <div>
                      <span className="font-medium text-gray-800">
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="text-red-500 ml-1 font-bold">*</span>
                      )}
                    </div>
                    <select
                      value={(mapping as any)[field.key] || ""}
                      onChange={(e) =>
                        setMapping({ ...mapping, [field.key]: e.target.value })
                      }
                      className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 max-w-[180px] truncate"
                    >
                      <option value="">-- Ignore --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preview & Duplicate Report */}
          {step === "preview" && validationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                  <div className="text-xl font-bold text-emerald-700">
                    {validationResult.validRecords.length}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-medium">Ready to Import</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <div className="text-xl font-bold text-amber-700">
                    {validationResult.duplicates.length}
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium">Duplicates Skipped</div>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                  <div className="text-xl font-bold text-red-700">
                    {validationResult.errors.length}
                  </div>
                  <div className="text-[11px] text-red-800 font-medium">Malformed Rows</div>
                </div>
              </div>

              {/* Sample preview table */}
              <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-60">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-100 text-gray-600 sticky top-0">
                    <tr>
                      <th className="p-2">Domain</th>
                      <th className="p-2">Backlink URL</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">DR</th>
                      <th className="p-2">DA</th>
                      <th className="p-2">Traffic</th>
                      <th className="p-2">Anchor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {validationResult.validRecords.slice(0, 8).map((rec, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2 font-medium text-gray-900">{rec.domain}</td>
                        <td className="p-2 text-gray-600 truncate max-w-[150px]">{rec.backlinkUrl}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 border text-gray-800">
                            {rec.status}
                          </span>
                        </td>
                        <td className="p-2 font-mono">{rec.dr}</td>
                        <td className="p-2 font-mono">{rec.da}</td>
                        <td className="p-2 font-mono">{rec.organicTraffic.toLocaleString()}</td>
                        <td className="p-2 truncate max-w-[120px]">{rec.anchorText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validationResult.duplicates.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                  <span className="font-bold">Duplicate Prevention Active:</span>{" "}
                  {validationResult.duplicates.length} records match backlinks already stored in{" "}
                  <span className="font-semibold">{PROJECTS[targetProject]?.name}</span> and will not overwrite existing rows.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            {step !== "upload" && (
              <button
                onClick={() => setStep(step === "preview" ? "mapping" : "upload")}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-100 font-medium"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            {step === "mapping" && (
              <button
                onClick={handleValidateMapping}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-sm"
              >
                <span>Preview & Validate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {step === "preview" && (
              <button
                onClick={handleCommit}
                disabled={isSubmitting || validationResult?.validRecords.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded font-medium shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing & Syncing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Import {validationResult?.validRecords.length} Records to {PROJECTS[targetProject]?.name}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
