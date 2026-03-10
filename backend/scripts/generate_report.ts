import fs from 'fs';
import path from 'path';

interface TestResult {
    section: string;
    passed: boolean;
    findings: string[];
}

export const generateReport = (results: TestResult[]) => {
    const totalPassed = results.filter(r => r.passed).length;
    const passRate = (totalPassed / results.length) * 100;

    // Enterprise Readiness Logic
    let readinessScore = passRate;
    if (results.some(r => r.section === 'Security' && !r.passed)) readinessScore -= 20;
    if (results.some(r => r.section === 'Authentication' && !r.passed)) readinessScore -= 30;

    const report = {
        platform: 'VARIX 2.0',
        audit_timestamp: new Date().toISOString(),
        enterprise_readiness_score: Math.max(0, readinessScore),
        summary: {
            total_sections: results.length,
            sections_passed: totalPassed,
            pass_rate: `${passRate}%`
        },
        detailed_results: results
    };

    const reportPath = path.join(process.cwd(), 'enterprise_readiness_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n======================================`);
    console.log(`AUDIT COMPLETE`);
    console.log(`Readiness Score: ${report.enterprise_readiness_score}`);
    console.log(`Report saved to: ${reportPath}`);
    console.log(`======================================\n`);

    return report;
};

// If run directly
if (require.main === module) {
    // Mock run for initial generation
    generateReport([
        { section: 'Authentication', passed: true, findings: [] },
        { section: 'RBAC', passed: true, findings: [] },
        { section: 'Tenant Isolation', passed: true, findings: [] },
        { section: 'Security', passed: false, findings: ['Rate limiting not strictly enforced on ingestion'] }
    ]);
}
