import apiClient from "./apiClient";

export interface GovernanceViolation {
    id: string;
    control_id: string;
    severity: string;
    violation_message: string;
    created_at: string;
    status?: string;
    controlSpec: {
        id: string;
        name: string;
        description: string | null;
        ruleType: string;
        severity: string;
    };
}

export interface CloseCycle {
    id: string;
    tenantId: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    tasks: any[];
}

export const governanceService = {
    async getViolations(): Promise<GovernanceViolation[]> {
        const response = await apiClient.get("/governance/violations");
        return response.data.violations || [];
    },

    async getCurrentCycle(): Promise<CloseCycle | null> {
        const response = await apiClient.get("/governance/cycles/current");
        return response.data.cycle || null;
    },

    async startCycle(period?: string) {
        return apiClient.post("/governance/cycles/start", { period: period || new Date().toISOString().slice(0, 7) });
    },

    async approveTask(taskId: string, status: "APPROVED" | "REJECTED", comments?: string) {
        return apiClient.post(`/governance/tasks/${taskId}/approve`, { status, comments });
    }
};
