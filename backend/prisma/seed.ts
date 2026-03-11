import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // Create a default tenant
    const tenant = await prisma.tenant.upsert({
        where: { id: '00000000-0000-0000-0000-000000000000' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'VARIX Master Tenant',
            industry: 'FinTech',
            company_size: 'Enterprise'
        }
    })

    // Create standard accounts
    const standardAccounts = [
        { code: '1000', name: 'Cash', type: 'ASSET' },
        { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
        { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
        { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
        { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
        { code: '9999', name: 'Suspense Clearing', type: 'ASSET' },
        { code: 'UNMAPPED', name: 'Unmapped Ingestions', type: 'ASSET' }
    ]

    for (const acc of standardAccounts) {
        await prisma.account.upsert({
            where: {
                tenantId_code: {
                    tenantId: tenant.id,
                    code: acc.code
                }
            },
            update: {},
            create: {
                tenantId: tenant.id,
                code: acc.code,
                name: acc.name,
                type: acc.type
            }
        })
    }

    console.log('Seed completed successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
