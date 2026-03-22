"use client";

import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import ConnectorStatusCard from "@/components/enterprise/ConnectorStatusCard";
import { Rocket, Zap, Layers, ShieldCheck, Database } from "lucide-react";
import { useState } from "react";
import TestImportModal from "@/components/modals/TestImportModal";
import { erpService } from "@/services/erpService";

const availableConnectors = [
    {
        id: "TALLY_CONNECTOR",
        name: "Tally Prime",
        description: "Real-time sync for localized ledgers and vouchers.",
        icon: Database,
    },
    {
        id: "ZOHO_CONNECTOR",
        name: "Zoho Books",
        description: "Sync global invoices and vendor matching dynamically.",
        icon: Layers,
    },
    {
        id: "SAP_CONNECTOR",
        name: "SAP S/4HANA",
        description: "Enterprise mapping for cost centers and control validation.",
        icon: ShieldCheck,
    },
];

export default function IntegrationsPage() {
    const { erp, loading, refresh } = useSystemState();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [connectingId, setConnectingId] = useState<string | null>(null);

    const handleSync = async (connectorId: string) => {
        setSyncingId(connectorId);
        try {
            await erpService.triggerSync(connectorId);
            await refresh();
        } catch (error) {
            console.error("Sync failed", error);
        } finally {
            setSyncingId(null);
        }
    };

    /**
     * erpService.createConnector now takes { type, config, frequency }
     * Previous code passed positional args: createConnector(type, config) — wrong.
     */
    const handleConnect = async (type: string) => {
        setConnectingId(type);
        try {
            await erpService.createConnector({
                type,
                config: {},
                frequency: "DAILY",
            });
            await refresh();
        } catch (error) {
            console.error("Connection failed", error);
        } finally {
            setConnectingId(null);
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
        <div className="space-y-8">
            <SystemActionBar
                title="ERP Connections"
                actions={[
                    {
                        label: "Import Test Dataset",
                        icon: Rocket,
                        onClick: () => setIsImportModalOpen(true),
                    },
                    {
                        label: "Establish New Node",
                        icon: Zap,
                        onClick: () => setIsImportModalOpen(true),
                        variant: "primary",
                    },
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableConnectors.map((ac) => {
                    // Match by connector_type (the actual DB field name)
                    const active = erp.connectors.find(
                        (c) => c.connector_type === ac.id
                    );

                    if (active) {
                        return (
                            <ConnectorStatusCard
                                key={active.id}
                                connector={active}
                                onSync={() => handleSync(active.id)}
                                isSyncing={syncingId === active.id}
                            />
                        );
                    }

                    return (
                        <div
                            key={ac.id}
                            className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg transition-all"
                        >
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary-brand flex items-center justify-center mb-4 border border-blue-100">
                                    <ac.icon size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">
                                    {ac.name}
                                </h3>
                                <p className="text-sm text-slate-500 mb-6">{ac.description}</p>
                            </div>
                            <button
                                onClick={() => handleConnect(ac.id)}
                                disabled={connectingId === ac.id}
                                className="w-full py-3 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-xl font-bold transition flex justify-center items-center gap-2 shadow-sm text-[11px] uppercase tracking-widest"
                            >
                                <Zap size={14} />
                                {connectingId === ac.id
                                    ? "Connecting..."
                                    : "Establish Connection"}
                            </button>
                        </div>
                    );
                })}
            </div>

            <TestImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={refresh}
            />
        </div>
    );
}