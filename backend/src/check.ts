import fs from 'fs';
import path from 'path';

console.log('--- START CHECK ---');
try {
    const tenantPath = path.join(__dirname, 'routes', 'tenant_v2.routes.ts');
    const content = fs.readFileSync(tenantPath, 'utf8');
    console.log('File:', tenantPath);
    console.log('File size:', content.length);
    console.log('Contains "middlewares" (plural):', content.includes('middlewares'));

    console.log('Attempting to import all modules from app.ts...');
    const modules = [
        './middleware/auth.middleware',
        './modules/auth/auth.routes',
        './modules/ingestion/ingestion.routes',
        './modules/analytics/analytics.routes',
        './modules/governance/governance.routes',
        './modules/accounting/accounting.routes',
        './routes/tenant_v2.routes',
        './routes/demo.routes',
        './routes/changes.routes',
        './routes/graph.routes',
        './routes/report.routes',
        './jobs/cron',
        './app'
    ];

    for (const mod of modules) {
        try {
            console.log(`Checking ${mod}...`);
            require(mod);
            console.log(`SUCCESS: ${mod}`);
        } catch (e: any) {
            console.log(`FAILED: ${mod}`, e.message);
            if (e.stack && e.message.includes('middlewares')) {
                console.log(e.stack);
            }
        }
    }
} catch (e: any) {
    console.log('FATAL:', e.message);
}
console.log('--- END CHECK ---');
