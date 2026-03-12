/**
 * FACTORY: Connector Resolver
 * PATH: src/modules/sources/connector.factory.ts
 */

import { IConnector } from "./connector.interface";
import { ZohoConnector } from "./connectors/zoho.connector";
// Import other connectors as they are implemented
// import { SapConnector } from "./connectors/sap.connector";

export class ConnectorFactory {
    static async getConnector(
        connectorType: string,
        tenantId: string,
        connectorId: string
    ): Promise<IConnector> {
        switch (connectorType) {
            case "ZOHO_CONNECTOR":
                return new ZohoConnector(tenantId, connectorId);

            // case "SAP_CONNECTOR":
            //     return new SapConnector(tenantId, connectorId);

            default:
                throw new Error(`Unsupported connector type: ${connectorType}`);
        }
    }
}
