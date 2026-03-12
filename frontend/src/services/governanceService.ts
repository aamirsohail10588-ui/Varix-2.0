import apiClient from "./apiClient";

export interface GovernanceViolation {
    id: string;
    type: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description: string;
    created_at: string;
}

export interface CloseCycle {
    id: string;
    period: string;
    status: "OPEN" | "CLOSED";
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

    async startCycle(period: string) {
        return apiClient.post("/governance/cycles/start", { period });
    }
};
