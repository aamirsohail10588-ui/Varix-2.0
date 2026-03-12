/**
 * MODULE: Evidence Signature Service
 * PATH: src/modules/governance/signature.service.ts
 *
 * Responsibilities:
 * - Generate SHA-256 signatures for evidence documents
 * - Verify document integrity against stored signatures
 */

import * as crypto from "crypto";
import prisma from "../../infrastructure/prisma";

export class EvidenceSignatureService {
    /**
     * Generate a cryptographic signature for a file buffer
     */
    static generateSignature(fileBuffer: Buffer): string {
        return crypto.createHash("sha256").update(fileBuffer).digest("hex");
    }

    /**
     * Verify if a document's current content matches its stored signature
     * @param documentId The ID of the evidence document
     * @param currentContent The current binary content of the file
     */
    static async verifyIntegrity(documentId: string, currentContent: Buffer): Promise<boolean> {
        const doc = await (prisma as any).evidenceDocument.findUnique({
            where: { id: documentId }
        });

        if (!doc || !doc.digitalSignature) return false;

        const currentSignature = this.generateSignature(currentContent);
        return currentSignature === doc.digitalSignature;
    }

    /**
     * Signs an existing document record with a hash of its content
     */
    static async signDocument(documentId: string, fileContent: Buffer): Promise<string> {
        const signature = this.generateSignature(fileContent);

        await (prisma as any).evidenceDocument.update({
            where: { id: documentId },
            data: { digitalSignature: signature }
        });

        return signature;
    }
}
