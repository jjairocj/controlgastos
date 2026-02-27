import { Currency, TransactionType, CategoryType } from '@prisma/client';
import { db } from '../src/lib/db';
import * as xlsx from 'xlsx';
import * as path from 'path';

async function main() {
    console.log('Limpiando base de datos completa...');
    await db.transfer.deleteMany();
    await db.transaction.deleteMany();
    await db.installment.deleteMany();
    await db.debt.deleteMany();
    await db.category.deleteMany();
    await db.account.deleteMany();
    await db.userSettings.deleteMany();

    console.log('Creando cuentas bancarias base...');
    // Corregido: La cuenta USD debe tener Currency.USD
    const cuentaUsd = await db.account.create({ data: { name: 'Cuenta USD Extranjera', currency: 'USD', balance: 0 } });
    const cuentaNu = await db.account.create({ data: { name: 'NU Bank', currency: 'COP', balance: 0 } });
    const cuentaNequi = await db.account.create({ data: { name: 'Nequi', currency: 'COP', balance: 0 } });
    const cuentaBbva = await db.account.create({ data: { name: 'BBVA', currency: 'COP', balance: 0 } });

    console.log('Creando configuración base...');
    await db.userSettings.create({
        data: { baseIncome: 6000, currency: 'USD' }
    });

    console.log('Creando categorías...');
    const catFijos = await db.category.create({ data: { name: 'Gastos Fijos', type: 'FIXED' } });
    const catVariables = await db.category.create({ data: { name: 'Gastos Variables', type: 'VARIABLE' } });
    const catDeudas = await db.category.create({ data: { name: 'Pago Deudas / Cuotas', type: 'FIXED' } });
    const catTransfers = await db.category.create({ data: { name: 'Transferencias', type: 'FIXED' } });

    console.log('Leyendo Excel original...');
    const filePath = path.join(__dirname, '../../Gastos Mensuales.xlsx');
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });

    const processCell = async (name: string, amount: number, day: number, month: number, accountId: string, categoryId: string) => {
        if (!amount || amount <= 0) return;
        const date = new Date(2026, month - 1, day, 12, 0, 0);

        const acc = await db.account.findUnique({ where: { id: accountId } });
        if (!acc) return;

        await db.transaction.create({
            data: {
                description: name,
                amount,
                type: 'EXPENSE',
                currency: acc.currency,
                date,
                accountId,
                categoryId
            }
        });

        // Actualizar balance
        await db.account.update({
            where: { id: accountId },
            data: { balance: { decrement: amount } }
        });
    };

    // Agregar Inyección de Saldo Inicial (Basado en el baseIncome)
    // Supongamos que empezamos con 6000 USD en la cuenta extranjera
    await db.account.update({
        where: { id: cuentaUsd.id },
        data: { balance: 6000 }
    });
    await db.transaction.create({
        data: {
            description: 'Saldo Inicial (Ingreso Base)',
            amount: 6000,
            type: 'INCOME',
            currency: 'USD',
            date: new Date(2026, 0, 1),
            accountId: cuentaUsd.id,
            categoryId: catFijos.id
        }
    });

    for (let i = 4; i < data.length; i++) {
        const row = data[i];
        if (!row || !row.length) continue;
        const rawName = row[1];
        if (!rawName || typeof rawName !== 'string' || rawName.includes('Total') || rawName.includes('IBC')) continue;
        const name = rawName.trim();
        if (name.length < 2) continue;

        let catId = (name.toLowerCase().includes('credito') || name.toLowerCase().includes('moto') || name.toLowerCase().includes('cuota'))
            ? catDeudas.id : catFijos.id;

        await processCell(name, row[3], 15, 1, cuentaUsd.id, catId);
        await processCell(name, row[5], 15, 1, cuentaNu.id, catId);
        await processCell(name, row[7], 30, 1, cuentaUsd.id, catId);
        await processCell(name, row[9], 30, 1, cuentaNu.id, catId);

        await processCell(name, row[11], 15, 2, cuentaUsd.id, catId);
        await processCell(name, row[13], 15, 2, cuentaNu.id, catId);
        await processCell(name, row[15], 30, 2, cuentaUsd.id, catId);
        await processCell(name, row[17], 30, 2, cuentaNu.id, catId);
    }

    // --- AGREGAR MOVIMIENTOS ESPECÍFICOS DEL USUARIO (CASOS DE EJEMPLO) ---
    console.log('Agregando movimientos de ejemplo reportados por el usuario...');

    // 1. Pago Cuota Andrea (2 partes en USD por error)
    await db.transaction.create({
        data: {
            description: 'Cuota Andrea (Parte 1/2)',
            amount: 548.70,
            currency: 'USD',
            type: 'EXPENSE',
            date: new Date(),
            accountId: cuentaUsd.id,
            categoryId: catDeudas.id,
            originalAmount: 2250000 / 2, // Estimación en COP
            exchangeRate: 2250000 / 2 / 548.70,
            originalCurrency: 'COP'
        }
    });
    await db.account.update({ where: { id: cuentaUsd.id }, data: { balance: { decrement: 548.70 } } });

    await db.transaction.create({
        data: {
            description: 'Cuota Andrea (Parte 2/2)',
            amount: 53.53,
            currency: 'USD',
            type: 'EXPENSE',
            date: new Date(),
            accountId: cuentaUsd.id,
            categoryId: catDeudas.id,
            originalAmount: 2250000 / 2,
            exchangeRate: 2250000 / 2 / 53.53,
            originalCurrency: 'COP'
        }
    });
    await db.account.update({ where: { id: cuentaUsd.id }, data: { balance: { decrement: 53.53 } } });

    // 2. Transferencia USD -> NU (1739.80 USD -> 6.500.000 COP)
    const transfer = await db.transfer.create({
        data: {
            fromAccountId: cuentaUsd.id,
            toAccountId: cuentaNu.id,
            amountSource: 1739.80,
            amountDest: 6500000,
            exchangeRate: 6500000 / 1739.80,
            description: 'Envío de fondos para gastos mes',
            date: new Date()
        }
    });

    await db.transaction.create({
        data: {
            description: `Transferencia a NU Bank: Fondos mes`,
            amount: 1739.80,
            currency: 'USD',
            type: 'EXPENSE',
            date: new Date(),
            accountId: cuentaUsd.id,
            transferId: transfer.id,
            categoryId: catTransfers.id
        }
    });
    await db.account.update({ where: { id: cuentaUsd.id }, data: { balance: { decrement: 1739.80 } } });

    await db.transaction.create({
        data: {
            description: `Transferencia desde USD: Fondos mes`,
            amount: 6500000,
            currency: 'COP',
            type: 'INCOME',
            date: new Date(),
            accountId: cuentaNu.id,
            transferId: transfer.id,
            categoryId: catTransfers.id
        }
    });
    await db.account.update({ where: { id: cuentaNu.id }, data: { balance: { increment: 6500000 } } });

    console.log(`¡Importación completada con saldos y casos de uso del usuario!`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
