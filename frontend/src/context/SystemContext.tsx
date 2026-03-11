"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ledgerService, LedgerMetric } from "@/services/ledgerService";
import { snapshotService, Snapshot } from "@/services/snapshotService";
import { erpService, ERPConnector } from "@/services/erpService";
import { governanceService, GovernanceViolation, CloseCycle } from "@/services/governanceService";
import { anomalyService, RiskVectors } from "@/services/anomalyService";
import { integrityService, IntegrityScore } from "@/services/integrityService";
import api from "@/lib/api";

interface SystemState {
    health: {
        status: "HEALTHY" | "DEGRADED" | "CRITICAL";
        latency: number;
        uptime: string;
    } | null;
    ledger: LedgerMetric | null;
    ingestion: {
        history: Snapshot[];
        queueDepth: number;
    };
    governance: {
        violations: GovernanceViolation[];
        currentCycle: CloseCycle | null;
    };
    anomalies: RiskVectors | null;
    integrity: IntegrityScore | null;
    erp: {
        connectors: ERPConnector[];
    };
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

const SystemContext = createContext<SystemState | undefined>(undefined);

export function SystemProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<Omit<SystemState, 'refresh'>>({
        health: null,
        ledger: null,
        ingestion: { history: [], queueDepth: 0 },
        governance: { violations: [], currentCycle: null },
        anomalies: null,
        integrity: null,
        erp: { connectors: [] },
        loading: true,
        error: null,
    });

    const fetchSystemData = useCallback(async () => {
        try {
            const [healthRes, ledger, history, violations, cycle, risk, integrity, connectors] = await Promise.all([
                api.get("/system/worker-health"),
                ledgerService.getMetrics(),
                snapshotService.getHistory(),
                governanceService.getViolations(),
                governanceService.getCurrentCycle(),
                anomalyService.getRiskVectors(),
                integrityService.getFinancialHealth(),
                erpService.getConnectors(),
            ]);

            const healthData = healthRes.data;

            setState({
                health: {
                    status: healthData.status,
                    latency: Math.round(Number(healthData.performance?.snapshot_processing_duration || 0)),
                    uptime: "12d 4h 12m", // Static for now as per dashboard requirements
                },
                ledger,
                ingestion: {
                    history,
                    queueDepth: healthData.queues?.total || 0,
                },
                governance: {
                    violations,
                    currentCycle: cycle,
                },
                anomalies: risk,
                integrity,
                erp: { connectors },
                loading: false,
                error: null,
            });
        } catch (err: any) {
            console.error("Failed to fetch system state", err);
            setState(prev => ({ ...prev, loading: false, error: err.message }));
        }
    }, []);

    useEffect(() => {
        fetchSystemData();
        const interval = setInterval(fetchSystemData, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [fetchSystemData]);

    return (
        <SystemContext.Provider value={{ ...state, refresh: fetchSystemData }}>
            {children}
        </SystemContext.Provider>
    );
}

export function useSystem() {
    const context = useContext(SystemContext);
    if (context === undefined) {
        throw new Error("useSystem must be used within a SystemProvider");
    }
    return context;
}
