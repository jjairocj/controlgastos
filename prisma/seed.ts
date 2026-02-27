import { PrismaClient, Currency, AccountType, DebtType, CategoryType } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Iniciando Seed...");

    // 1. Limpiar datos existentes
    await prisma.transaction.deleteMany();
    await prisma.installment.deleteMany();
    await prisma.debt.deleteMany();
    await prisma.category.deleteMany();
    await prisma.account.deleteMany();

    // 2. Crear Categorías
    const catTransporte = await prisma.category.create({ data: { name: "Transporte", type: CategoryType.VARIABLE } });
    const catAlimentacion = await prisma.category.create({ data: { name: "Alimentación", type: CategoryType.VARIABLE } });
    const catOcio = await prisma.category.create({ data: { name: "Ocio", type: CategoryType.VARIABLE } });
    const catVivienda = await prisma.category.create({ data: { name: "Vivienda", type: CategoryType.FIXED } });

    // 3. Crear Cuentas
    const accAhorros = await prisma.account.create({
        data: {
            name: "Nómina Bancolombia",
            type: AccountType.SAVINGS,
            balance: 5000000,
            currency: Currency.COP,
        },
    });

    const accBBVA = await prisma.account.create({
        data: {
            name: "BBVA Platinum",
            type: AccountType.CREDIT_CARD,
            balance: 0,
            creditLimit: 12000000,
            currency: Currency.COP,
        },
    });

    const accAmazon = await prisma.account.create({
        data: {
            name: "Amazon Rewards (USD)",
            type: AccountType.CREDIT_CARD,
            balance: 0,
            creditLimit: 3000,
            currency: Currency.USD,
        },
    });

    // 4. Crear Deudas
    // Deuda 1: Préstamo de Vivienda (Libre Inversión)
    const debtPrestamo = await prisma.debt.create({
        data: {
            name: "Crédito Libre Inversión",
            type: DebtType.PERSONAL_LOAN,
            totalAmount: 15000000,
            disbursementAmount: 12000000,
            currency: Currency.COP,
            interestRate: 2.1,
            installments: {
                create: Array.from({ length: 12 }).map((_, i) => ({
                    installmentNum: i + 1,
                    totalInstallments: 12,
                    amount: 1250000,
                    dueDate: new Date(2026, 2 + i, 15),
                    isPaid: i === 0, // Primera cuota pagada
                })),
            },
        },
    });

    // Deuda 2: Compra a cuotas en BBVA
    const debtMacbook = await prisma.debt.create({
        data: {
            name: "Macbook Air M3",
            type: DebtType.CREDIT_CARD,
            accountId: accBBVA.id,
            totalAmount: 4800000,
            disbursementAmount: 4800000,
            currency: Currency.COP,
            interestRate: 0, // 0% interés
            installments: {
                create: Array.from({ length: 6 }).map((_, i) => ({
                    installmentNum: i + 1,
                    totalInstallments: 6,
                    amount: 800000,
                    dueDate: new Date(2026, 2 + i, 28),
                    isPaid: false,
                })),
            },
        },
    });

    console.log("Seed completado satisfactoriamente.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
