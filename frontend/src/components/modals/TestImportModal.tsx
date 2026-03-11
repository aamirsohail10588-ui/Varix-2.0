"use client";

import React, { useState } from "react";
import { X, Upload, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";
import api from "@/lib/api";

interface TestImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function TestImportModal({ isOpen, onClose, onSuccess }: TestImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [sourceSystem, setSourceSystem] = useState("SAP S/4HANA");
    const [entity, setEntity] = useState("North America");
    const [period, setPeriod] = useState("2026-03");
    const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "completed" | "error">("idle");
    const [message, setMessage] = useState("");
    const [progress, setProgress] = useState(0);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setStatus("uploading");
        setMessage("Uploading CSV dataset...");
        setProgress(25);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("sourceSystem", sourceSystem);
        formData.append("entity", entity);
        formData.append("period", period);

        try {
            const res = await api.post("/ingestion/import-test", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setStatus("processing");
            setMessage("Validating schema and calculating change detection...");
            setProgress(60);

            // Simulate progress for pipeline stages
            setTimeout(() => {
                setProgress(85);
                setMessage("Executing control engine and risk scoring...");
            }, 1500);

            setTimeout(() => {
                setStatus("completed");
                setMessage("Simulation import completed. Data is now flowing through VARIX modules.");
                setProgress(100);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }, 3500);

        } catch (error: any) {
            console.error("Upload failed", error);
            setStatus("error");
            setMessage(error.response?.data?.error || "Failed to process simulation import.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Upload className="text-primary-brand" size={20} /> Import Test Dataset
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-8">
                    {status === "idle" ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Source System</label>
                                    <select
                                        value={sourceSystem}
                                        onChange={(e) => setSourceSystem(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-brand/20 outline-none text-sm font-medium"
                                    >
                                        <option>SAP S/4HANA</option>
                                        <option>Oracle NetSuite</option>
                                        <option>Zoho Books</option>
                                        <option>Tally Prime</option>
                                        <option>Custom ERP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Entity</label>
                                    <select
                                        value={entity}
                                        onChange={(e) => setEntity(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-brand/20 outline-none text-sm font-medium"
                                    >
                                        <option>Global Consolidation</option>
                                        <option>North America</option>
                                        <option>EMEA Region</option>
                                        <option>APAC Hub</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <div className="flex flex-col items-center">
                                        <FileText className="text-primary-brand mb-3" size={40} />
                                        <p className="text-sm font-bold text-slate-800">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="text-slate-300 group-hover:text-primary-brand transition-colors mb-3" size={40} />
                                        <p className="text-sm font-semibold text-slate-600">Click to upload or drag and drop</p>
                                        <p className="text-xs text-slate-400 mt-1">Accepts .CSV files up to 50MB</p>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!file}
                                className={`w-full py-4 rounded-2xl font-bold transition flex justify-center items-center gap-2 shadow-lg ${file ? "bg-primary-brand hover:bg-blue-700 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                            >
                                Start Ingestion Simulation
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10">
                            {status === "completed" ? (
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle size={32} />
                                </div>
                            ) : status === "error" ? (
                                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                                    <AlertCircle size={32} />
                                </div>
                            ) : (
                                <div className="relative mb-6">
                                    <Loader2 className="text-primary-brand animate-spin" size={48} />
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-brand">
                                        {progress}%
                                    </span>
                                </div>
                            )}

                            <h3 className={`text-lg font-bold mb-2 ${status === "error" ? "text-rose-600" : "text-slate-900"}`}>
                                {status === "completed" ? "Ingestion Successful" : status === "error" ? "Ingestion Failed" : "Processing Pipeline"}
                            </h3>
                            <p className="text-sm text-slate-500 text-center max-w-sm">
                                {message}
                            </p>

                            <div className="w-full bg-slate-100 h-2 rounded-full mt-8 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${status === "error" ? "bg-rose-500" : "bg-primary-brand"}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            {status === "error" && (
                                <button
                                    onClick={() => setStatus("idle")}
                                    className="mt-8 text-primary-brand font-bold text-sm hover:underline"
                                >
                                    Try again with another file
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
