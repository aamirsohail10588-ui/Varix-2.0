import apiClient from "./apiClient";

export interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    user_id: string;
    created_at: string;
    details: any;
}

export const auditService = {
    async getRecentLogs(limit: number = 50): Promise<AuditLog[]> {
        const response = await apiClient.get(`/tenants/audit-logs?limit=${limit}`);
        return response.data.logs || [];
    },

    async getEvidencePackage(period: string) {
        return apiClient.get(`/governance/violations/export?period=${period}`);
    }
};
