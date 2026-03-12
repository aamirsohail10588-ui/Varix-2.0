/**
 * SERVICE: Account Mapping System
 * PATH: src/modules/governance/mapping.service.ts
 */

import prisma from "../../infrastructure/prisma";

export class AccountMappingService {
    /**
     * Create or update a source-to-target account mapping
     */
    static async upsertMapping(
        tenantId: string,
        sourceSystem: string,
        sourceCode: string,
        targetAccountId: string,
        confidenceScore: number = 100,
        isManual: boolean = true
    ) {
        return prisma.accountMap.upsert({
            where: {
                tenant_id_source_system_source_code: {
                    tenant_id: tenantId,
                    source_system: sourceSystem,
                    source_code: sourceCode.toUpperCase()
                }
            },
            update: {
                target_account_id: targetAccountId,
                confidence_score: confidenceScore,
                is_manual: isManual
            },
            create: {
                tenant_id: tenantId,
                source_system: sourceSystem,
                source_code: sourceCode.toUpperCase(),
                target_account_id: targetAccountId,
                confidence_score: confidenceScore,
                is_manual: isManual
            }
        });
    }

    /**
     * Bulk upload mappings (useful for migrations)
     */
    static async bulkImport(tenantId: string, mappings: any[]) {
        for (const m of mappings) {
            await this.upsertMapping(
                tenantId,
                m.sourceSystem,
                m.sourceCode,
                m.targetAccountId,
                m.confidenceScore,
                m.isManual
            );
        }
    }
}
