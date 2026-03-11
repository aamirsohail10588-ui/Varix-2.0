"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { FileText, UploadCloud, Trash2, XCircle, CheckCircle } from "lucide-react";

interface EvidencePanelProps {
    entityId: string;
    entityType: "CLOSE_TASK" | "CONTROL_VIOLATION" | "JOURNAL_ENTRY" | "INVOICE";
    defaultDocType?: "BANK_STATEMENT" | "RECONCILIATION_FILE" | "INVOICE_PDF" | "TAX_DOCUMENT" | "AUDIT_EVIDENCE";
}

export default function EvidencePanel({ entityId, entityType, defaultDocType = "AUDIT_EVIDENCE" }: EvidencePanelProps) {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    // Read list on mount
    useEffect(() => {
        if (!entityId) return;
        fetchDocuments();
    }, [entityId]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const token = Cookies.get("token");
            const tenantId = localStorage.getItem("activeTenantId");
            const res = await axios.get(`http://localhost:5000/api/evidence/by-entity/${entityId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-tenant-id": tenantId
                }
            });
            setDocuments(res.data || []);
        } catch (err) {
            console.error("Failed to load evidence for entity", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError("");

        try {
            const token = Cookies.get("token");
            const tenantId = localStorage.getItem("activeTenantId");

            const formData = new FormData();
            formData.append("file", file);
            formData.append("entity_type", entityType);
            formData.append("entity_id", entityId);
            formData.append("document_type", defaultDocType);

            await axios.post("http://localhost:5000/api/evidence/upload", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-tenant-id": tenantId,
                    "Content-Type": "multipart/form-data"
                }
            });
            await fetchDocuments(); // Refresh list after upload
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to upload file");
        } finally {
            setUploading(false);
            if (e.target) e.target.value = ""; // Reset file input generically
        }
    };

    return (
        <div className="bg-neutral-900/60 rounded-xl p-4 border border-neutral-800/80 mt-4 shadow-inner">
            <h4 className="text-sm font-semibold text-neutral-300 mb-4 flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" /> Evidence Vault
            </h4>

            {error && (
                <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError("")}><XCircle size={14} /></button>
                </div>
            )}

            <div className="space-y-2 mb-4">
                {loading ? (
                    <div className="text-xs text-neutral-500 animate-pulse">Loading documents...</div>
                ) : documents.length === 0 ? (
                    <div className="text-xs text-neutral-500 italic">No supporting evidence uploaded yet.</div>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between text-xs bg-neutral-950/50 p-2 rounded border border-neutral-800/50 group">
                            <div className="flex items-center gap-2 overflow-hidden w-full pr-4">
                                <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                                <a href={`http://localhost:5000${doc.file_path}`} target="_blank" rel="noreferrer" className="text-neutral-200 hover:text-indigo-300 truncate transition-colors">
                                    {doc.file_name}
                                </a>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-[10px] text-neutral-600 hidden md:inline-block">
                                    {new Date(doc.uploaded_at).toLocaleDateString()}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-medium border border-indigo-500/20">
                                    {doc.document_type.replace(/_/g, " ")}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="relative">
                <input
                    type="file"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-dashed border-neutral-700 bg-neutral-800/40 text-xs font-medium transition-all ${uploading ? 'text-neutral-500' : 'text-neutral-300 hover:bg-neutral-800 hover:border-indigo-500/50 hover:text-indigo-300'}`}>
                    <UploadCloud size={16} />
                    {uploading ? "Uploading Securely..." : "Upload Missing Evidence"}
                </div>
            </div>
        </div>
    );
}
