/**
 * SERVICE: Enterprise Schema Registry
 * PATH: src/modules/governance/registry.service.ts
 */

import prisma from "../../infrastructure/prisma";
import { Prisma } from "@prisma/client";

export class SchemaRegistryService {
    /**
     * Register or update a schema definition
     */
    static async registerSchema(
        tenantId: string,
        entityType: string,
        schemaJson: any
    ) {
        // Find latest version
        const latest = await prisma.schemaRegistry.findFirst({
            where: { tenant_id: tenantId, entity_type: entityType },
            orderBy: { version: "desc" }
        });

        const newVersion = (latest?.version || 0) + 1;

        return prisma.schemaRegistry.create({
            data: {
                tenant_id: tenantId,
                entity_type: entityType,
                schema_json: schemaJson as Prisma.InputJsonValue,
                version: newVersion,
                is_active: true
            }
        });
    }

    /**
     * Get the active schema for an entity type
     */
    static async getSchema(tenantId: string, entityType: string) {
        return prisma.schemaRegistry.findFirst({
            where: {
                tenant_id: tenantId,
                entity_type: entityType,
                is_active: true
            },
            orderBy: { version: "desc" }
        });
    }

    /**
     * Validate data against registered schema
     */
    static async validateAgainstSchema(
        tenantId: string,
        entityType: string,
        data: any
    ): Promise<{ isValid: boolean; errors: string[] }> {
        const entry = await this.getSchema(tenantId, entityType);
        if (!entry) return { isValid: true, errors: [] }; // No schema = valid (permissive)

        const schema = entry.schema_json as any;
        const errors: string[] = [];

        if (schema.required) {
            for (const field of schema.required) {
                if (data[field] === undefined || data[field] === null || data[field] === "") {
                    errors.push(`Missing required field: ${field}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
