
import { PrismaClient } from '@prisma/client';
import { addMonths } from 'date-fns';

const prisma = new PrismaClient();

async function calculateTEA(P: number, PMT: number, n: number) {
    let r = (PMT * n / P - 1) / n;
    for (let i = 0; i < 20; i++) {
        const pow = Math.pow(1 + r, n);
        const f = PMT * (pow - 1) / (r * pow) - P;
        const df = PMT * ((1 - Math.pow(1 + r, -n)) / (r * r) - n * Math.pow(1 + r, -n - 1) / r);
        const nextR = r - f / (-df);
        if (Math.abs(nextR - r) < 0.00001) {
            r = nextR;
            break;
        }
        r = nextR;
    }
    return Math.pow(1 + r, 12) - 1;
}

async function main() {
    console.log("Iniciando reparación de deudas...");
    const debts = await prisma.debt.findMany({
        include: { installments: { orderBy: { installmentNum: 'asc' } } }
    });

    for (const debt of debts) {
        console.log(`Procesando: ${debt.name}...`);

        // 1. Recalcular TEA
        if (debt.disbursementAmount && debt.totalAmount > 0) {
            const avgPMT = debt.installments[0]?.amount || (debt.totalAmount / (debt.installments.length || 1));
            const tea = await calculateTEA(debt.disbursementAmount, avgPMT, debt.installments.length);
            await prisma.debt.update({
                where: { id: debt.id },
                data: { effectiveAnnualRate: tea }
            });
            console.log(`  - Nueva TEA: ${(tea * 100).toFixed(2)}%`);
        }

        // 2. Corregir Horas de Cuotas (Timezone fix)
        for (const inst of debt.installments) {
            const d = new Date(inst.dueDate);
            if (d.getHours() !== 12) {
                d.setHours(12, 0, 0, 0);
                await prisma.installment.update({
                    where: { id: inst.id },
                    data: { dueDate: d }
                });
            }
        }
        console.log(`  - Fechas normalizadas a 12:00 PM.`);
    }

    console.log("Mantenimiento completado.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
