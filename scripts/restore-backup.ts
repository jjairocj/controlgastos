import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando restauración desde backup...');

    // Leer archivo de backup
    const backupFile = path.join(__dirname, '../backups/finanzas_backup_2026-02-28T23-33-17.json');
    if (!fs.existsSync(backupFile)) {
        throw new Error(`No se encontró el archivo de backup en: ${backupFile}`);
    }

    console.log('Leyendo archivo JSON...');
    const rawData = fs.readFileSync(backupFile, 'utf-8');
    const backup = JSON.parse(rawData);
    const data = backup.data;

    // Función auxiliar para borrar en orden seguro
    console.log('Limpiando base de datos actual...');
    await prisma.transaction.deleteMany();
    await prisma.installment.deleteMany();
    await prisma.recurringItem.deleteMany();
    await prisma.debt.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.account.deleteMany();
    await prisma.category.deleteMany();
    await prisma.exchangeRate.deleteMany();
    await prisma.userSettings.deleteMany();
    console.log('Base de datos limpiada correctamente.');

    // Función auxiliar para insertar y manejar fechas si es necesario
    // Prisma acepta ISO strings para DateTime en la mayoría de casos
    console.log('Restaurando datos...');

    if (data.userSettings && data.userSettings.length > 0) {
        console.log(`Insertando ${data.userSettings.length} UserSettings...`);
        await prisma.userSettings.createMany({ data: data.userSettings });
    }

    if (data.categories && data.categories.length > 0) {
        console.log(`Insertando ${data.categories.length} Categories...`);
        await prisma.category.createMany({ data: data.categories });
    }

    if (data.accounts && data.accounts.length > 0) {
        console.log(`Insertando ${data.accounts.length} Accounts...`);
        await prisma.account.createMany({ data: data.accounts });
    }

    if (data.exchangeRates && data.exchangeRates.length > 0) {
        console.log(`Insertando ${data.exchangeRates.length} ExchangeRates...`);
        await prisma.exchangeRate.createMany({ data: data.exchangeRates });
    }

    if (data.recurringItems && data.recurringItems.length > 0) {
        console.log(`Insertando ${data.recurringItems.length} RecurringItems...`);
        await prisma.recurringItem.createMany({ data: data.recurringItems });
    }

    if (data.debts && data.debts.length > 0) {
        console.log(`Insertando ${data.debts.length} Debts...`);
        await prisma.debt.createMany({ data: data.debts });
    }

    if (data.installments && data.installments.length > 0) {
        console.log(`Insertando ${data.installments.length} Installments...`);
        await prisma.installment.createMany({ data: data.installments });
    }

    if (data.transfers && data.transfers.length > 0) {
        console.log(`Insertando ${data.transfers.length} Transfers...`);
        await prisma.transfer.createMany({ data: data.transfers });
    }

    if (data.transactions && data.transactions.length > 0) {
        console.log(`Insertando ${data.transactions.length} Transactions...`);
        await prisma.transaction.createMany({ data: data.transactions });
    }

    console.log('¡Restauración completada con éxito!');
}

main()
    .catch((e) => {
        console.error('Error durante la restauración:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
