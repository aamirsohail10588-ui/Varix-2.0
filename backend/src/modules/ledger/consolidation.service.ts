/**
 * SERVICE: Multi-Currency Consolidation
 * PATH: src/modules/ledger/consolidation.service.ts
 */

import prisma from "../../infrastructure/prisma";

export class ConsolidationService {
    /**
     * Fetch exchange rate for a given currency pair
     * TODO: Integrate with Layer 12 real-time FX service
     */
    static async getExchangeRate(
        fromCurrency: string,
        toCurrency: string,
        date: Date = new Date()
    ): Promise<number> {
        if (fromCurrency === toCurrency) return 1.0;

        // Mock rates for enterprise demonstration
        const mockRates: Record<string, number> = {
            "EUR": 1.10,
            "GBP": 1.25,
            "INR": 0.012,
            "AED": 0.27,
            "JPY": 0.0067
        };

        if (toCurrency === "USD") {
            return mockRates[fromCurrency.toUpperCase()] || 1.0;
        }

        // Cross-currency via USD
        const rateToUsd = mockRates[fromCurrency.toUpperCase()] || 1.0;
        const usdToTarget = 1 / (mockRates[toCurrency.toUpperCase()] || 1.0);

        return rateToUsd * usdToTarget;
    }

    /**
     * Convert an amount to the tenant's base currency
     */
    static async convertToBaseCurrency(
        tenantId: string,
        amount: number,
        sourceCurrency: string,
        date: Date
    ): Promise<number> {
        // Assume USD is the corporate default if tenant hasn't specified
        const targetCurrency = "USD";

        const rate = await this.getExchangeRate(sourceCurrency, targetCurrency, date);
        return amount * rate;
    }
}
