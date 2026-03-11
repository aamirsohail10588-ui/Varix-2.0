"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ledgerService, LedgerMetric } from "@/services/ledgerService";
import { ingestionService } from "@/services/ingestionService";
import { erpService, ERPConnector } from "@/services/erpService";
import { governanceService, GovernanceViolation, CloseCycle } from "@/services/governanceService";
import { anomalyService, RiskVectors } from "@/services/anomalyService";
import { integrityService, IntegrityScore } from "@/services/integrityService";
import { reconciliationService, ReconciliationRun } from "@/services/reconciliationService";
import { auditService, AuditLog } from "@/services/auditService";
import { fpnaService, Benchmark, FPNASummary } from "@/services/fpnaService";
import apiClient from "@/services/apiClient";

interface SystemState {
    health: {
        status: "HEALTHY" | "DEGRADED" | "CRITICAL";
        latency: number;
        uptime: string;
    } | null;
    ledger: LedgerMetric | null;
    ingestion: {
        history: any[];
        queueDepth: number;
    };
    reconciliation: {
        runs: ReconciliationRun[];
    };
    integrity: IntegrityScore | null;
    governance: {
        violations: GovernanceViolation[];
        currentCycle: CloseCycle | null;
    };
    anomalies: RiskVectors | null;
    erp: {
        connectors: ERPConnector[];
    };
    auditEvidence: {
        logs: AuditLog[];
    };
    fpna: {
        benchmarks: Benchmark[];
        summary: FPNASummary | null;
    };
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

const SystemStateContext = createContext<SystemState | undefined>(undefined);

export function SystemStateProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<Omit<SystemState, 'refresh'>>({
        health: null,
        ledger: null,
        ingestion: { history: [], queueDepth: 0 },
        reconciliation: { runs: [] },
        integrity: null,
        governance: { violations: [], currentCycle: null },
        anomalies: null,
        erp: { connectors: [] },
        auditEvidence: { logs: [] },
        fpna: { benchmarks: [], summary: null },
        loading: true,
        error: null,
    });

    const fetchSystemData = useCallback(async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
            if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
                window.location.href = "/login";
            }
            return;
        }

        try {
            const results = await Promise.allSettled([
                apiClient.get("/system/worker-health"),
                ledgerService.getMetrics(),
                ingestionService.getHistory(),
                governanceService.getViolations(),
                governanceService.getCurrentCycle(),
                anomalyService.getRiskVectors(),
                integrityService.getFinancialHealth(),
                erpService.getConnectors(),
                reconciliationService.getRuns(),
                auditService.getRecentLogs(),
                fpnaService.getBenchmarks(),
                fpnaService.getSummary(),
            ]);

            const getValue = (index: number, defaultValue: any) =>
                results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<any>).value : defaultValue;

            const healthRes = getValue(0, { data: { status: "DEGRADED" } });
            const healthData = healthRes.data;

            setState({
                health: {
                    status: healthData.status || "DEGRADED",
                    latency: Math.round(Number(healthData.performance?.snapshot_processing_duration || 0)),
                    uptime: "12d 4h 12m",
                },
                ledger: getValue(1, null),
                ingestion: {
                    history: getValue(2, []),
                    queueDepth: healthData.queues?.total || 0,
                },
                reconciliation: {
                    runs: getValue(8, []),
                },
                integrity: getValue(6, null),
                governance: {
                    violations: getValue(3, []),
                    currentCycle: getValue(4, null),
                },
                anomalies: getValue(5, null),
                erp: { connectors: getValue(7, []) },
                auditEvidence: { logs: getValue(9, []) },
                fpna: {
                    benchmarks: getValue(10, []),
                    summary: getValue(11, null)
                },
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
        const interval = setInterval(fetchSystemData, 60000);
        return () => clearInterval(interval);
    }, [fetchSystemData]);

    return (
        <SystemStateContext.Provider value={{ ...state, refresh: fetchSystemData }}>
            {children}
        </SystemStateContext.Provider>
    );
}

export function useSystemState() {
    const context = useContext(SystemStateContext);
    if (context === undefined) {
        throw new Error("useSystemState must be used within a SystemStateProvider");
    }
    return context;
}

export function useSystemMetrics() {
    const state = useSystemState();
    return {
        health: state.health,
        ledger: state.ledger,
        integrity: state.integrity,
        anomalies: state.anomalies,
        ingestion: state.ingestion,
    };
}
