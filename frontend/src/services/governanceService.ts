import api from "@/lib/api";

export interface GovernanceViolation {
    id: string;
    type: string;
    severity: "high" | "medium" | "low";
    description: string;
    status: string;
}

export interface CloseCycle {
    id: string;
    period: string;
    status: string;
    progress: number;
    tasks: any[];
}

export const governanceService = {
    async getViolations(): Promise<GovernanceViolation[]> {
        const response = await api.get("/governance/violations");
        return response.data.violations || [];
    },

    async getCurrentCycle(): Promise<CloseCycle | null> {
        const response = await api.get("/governance/cycles/current");
        return response.data.cycle;
    },

    async executeControl(controlId: string) {
        return api.post(`/governance/controls/${controlId}/run`);
    }
};
