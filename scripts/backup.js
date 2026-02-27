const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backup() {
    console.log('Iniciando backup de la base de datos de FinanzasTracker...');

    try {
        // Definimos el objeto que contendrá toda la base de datos
        const fullBackup = {
            timestamp: new Date().toISOString(),
            data: {}
        };

        // Extraer todas las tablas
        console.log('Extrayendo UserSettings...');
        fullBackup.data.userSettings = await prisma.userSettings.findMany();

        console.log('Extrayendo Categories...');
        fullBackup.data.categories = await prisma.category.findMany();

        console.log('Extrayendo Accounts...');
        fullBackup.data.accounts = await prisma.account.findMany();

        console.log('Extrayendo Transactions...');
        fullBackup.data.transactions = await prisma.transaction.findMany();

        console.log('Extrayendo Transfers...');
        fullBackup.data.transfers = await prisma.transfer.findMany();

        console.log('Extrayendo Debts...');
        fullBackup.data.debts = await prisma.debt.findMany();

        console.log('Extrayendo Installments...');
        fullBackup.data.installments = await prisma.installment.findMany();

        console.log('Extrayendo RecurringItems...');
        fullBackup.data.recurringItems = await prisma.recurringItem.findMany();

        console.log('Extrayendo ExchangeRates...');
        fullBackup.data.exchangeRates = await prisma.exchangeRate.findMany();

        // Crear directorio si no existe
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }

        // Formatear el nombre del archivo
        const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const filename = `finanzas_backup_${dateStr}.json`;
        const filepath = path.join(backupDir, filename);

        // Escribir a disco
        fs.writeFileSync(filepath, JSON.stringify(fullBackup, null, 2));

        console.log(`\n✅ Backup completado exitosamente!`);
        console.log(`📁 Archivo guardado en: ${filepath}`);
        console.log(`📊 Tamaño aproximado: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

    } catch (error) {
        console.error('❌ Hubo un error al realizar el backup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

backup();
