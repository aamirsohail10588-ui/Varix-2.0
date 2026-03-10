"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plug, Zap, CheckCircle, RefreshCw, Layers, ShieldCheck, Database, RefreshCcw, Rocket } from "lucide-react";
import Cookies from "js-cookie";
import TestImportModal from "../../components/modals/TestImportModal";

export default function IntegrationsPage() {
    const [connectors, setConnectors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const availableConnectors = [
        { id: "TALLY_CONNECTOR", name: "Tally Prime", description: "Real-time sync for localized ledgers and vouchers.", icon: <Database /> },
        { id: "ZOHO_CONNECTOR", name: "Zoho Books", description: "Sync global invoices and vendor matching dynamically.", icon: <Layers /> },
        { id: "SAP_CONNECTOR", name: "SAP S/4HANA", description: "Enterprise mapping for cost centers and control validation.", icon: <ShieldCheck /> }
    ];

    useEffect(() => {
        fetchConnectors();
    }, []);

    const fetchConnectors = async () => {
        try {
            const res = await api.get("/ingestion/connectors/status");
            setConnectors(res.data.connectors || []);
        } catch (error) {
            console.error("Failed to load integrations", error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (type: string) => {
        try {
            const token = Cookies.get("token");
            const tenantId = localStorage.getItem("activeTenantId");

            // Generate mock config cleanly seamlessly connecting natively
            const config = { api_key: "MOCK_KEY_123", endpoint: `https://api.${type.toLowerCase()}.com/v1` };

            await api.post("/ingestion/connectors/create", {
                type, config, frequency: "DAILY"
            });

            await fetchConnectors();
        } catch (error) {
            console.error("Failed to connect", error);
        }
    };

    const handleSync = async (connectorId: string) => {
        setIsSyncing(connectorId);
        try {
            const token = Cookies.get("token");
            const tenantId = localStorage.getItem("activeTenantId");

            await api.post("/ingestion/connectors/sync", { connectorId });

            await fetchConnectors();
        } catch (error) {
            console.error("Failed to sync natively", error);
        } finally {
            setIsSyncing(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-brand"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-10 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2 flex items-center gap-3">
                        <Plug className="text-primary-brand" /> ERP Connections
                    </h1>
                    <p className="text-slate-500 text-sm">Direct, governed synchronization with your systems of record.</p>
                </div>
                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm group"
                >
                    <Rocket size={18} className="text-primary-brand group-hover:scale-110 transition-transform" />
                    Import Test Dataset
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableConnectors.map((ac) => {
                    const activeConnection = connectors.find(c => c.connector_type === ac.id);

                    return (
                        <div key={ac.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between group hover:shadow-lg transition-all">
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary-brand flex items-center justify-center mb-4 border border-blue-100">
                                    {ac.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{ac.name}</h3>
                                <p className="text-sm text-slate-500 mb-6">{ac.description}</p>
                            </div>

                            {activeConnection ? (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
                                            <CheckCircle size={16} /> Connected
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                                            {activeConnection.sync_frequency}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Last Sync</p>
                                            <p className="text-xs font-semibold text-slate-700">
                                                {activeConnection.last_sync_at ? new Date(activeConnection.last_sync_at).toLocaleDateString() : "Never mapped"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleSync(activeConnection.id)}
                                            disabled={isSyncing === activeConnection.id}
                                            className={`p-2 rounded-lg transition-colors ${isSyncing === activeConnection.id ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm"}`}
                                        >
                                            <RefreshCcw size={16} className={isSyncing === activeConnection.id ? "animate-spin" : ""} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleConnect(ac.id)}
                                    className="w-full py-3 bg-primary-brand hover:bg-blue-700 text-white rounded-xl font-bold transition flex justify-center items-center gap-2 shadow-sm"
                                >
                                    <Zap size={16} /> Establish Connection
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <TestImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={fetchConnectors}
            />
        </div>
    );
}
