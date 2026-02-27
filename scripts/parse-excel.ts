import { PrismaClient, CategoryType, TransactionType, Currency, RecurrencePeriod } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

// Mapeo manual de la estructura visual del Excel del usuario
// Identificando que los índices impares a partir del 3 corresponden a las quincenas del año.
// Índices descubiertos (aprox): 3 (Ene Q1), 5 (Ene Q2), 7 (Feb Q1), 9 (Feb Q2)... hasta 49 (Dic Q2)
// NOTA: La estructura del excel mostraba col 3, 5, 7... veamos si es 3, 5, 7, 9, 11 (24 quincenas x 2 = offset 48)

async function main() {
    console.log('Iniciando proceso de Seed e Importación del Excel...');

    // 1. Limpiar base de datos (Opcional, dado que es seed inicial)
    await prisma.transaction.deleteMany();
    await prisma.installment.deleteMany();
    await prisma.debt.deleteMany();
    await prisma.category.deleteMany();

    // 2. Crear categorías fijas
    const fixedCategory = await prisma.category.create({
        data: { name: 'Gastos Fijos Operativos', type: CategoryType.FIXED }
    });
    const debtCategory = await prisma.category.create({
        data: { name: 'Pago Deudas y Cuotas', type: CategoryType.FIXED }
    });
    const savingsCategory = await prisma.category.create({
        data: { name: 'Ahorro / Inversión', type: CategoryType.FIXED }
    });
    const incomeCategory = await prisma.category.create({
        data: { name: 'Ingresos Nominales', type: CategoryType.VARIABLE }
    });

    // 3. Leer Excel
    const filePath = path.join(__dirname, '../../Gastos Mensuales.xlsx');
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawData: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });

    // 4. Parsear Filas e Identificar Cuotas/Quincenas
    // Asumiremos las filas > 0 que tengan nombre en índice 1 y montos.
    const currentYear = new Date().getFullYear();

    for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
        const row = rawData[rowIndex];
        if (!row || !row[1]) continue; // Saltar vacías

        const itemName: string = row[1];

        // Filtros para excluir agrupadores o celdas de subtotal (ej: 'Total Obligatorios', 'Costos')
        if (itemName.startsWith('Total') || itemName.includes('Costos')) continue;

        // Detectar si parece una deuda (contiene Cuota, Moto, Tarjeta)
        const isDebt = itemName.toLowerCase().includes('cuota') || itemName.toLowerCase().includes('moto') || itemName.toLowerCase().includes('tarjeta');

        let dbDebt = null;
        if (isDebt) {
            dbDebt = await prisma.debt.create({
                data: {
                    name: itemName,
                    type: 'OTHER',
                    totalAmount: 0, // Será calculado luego con la suma
                    currency: Currency.COP
                }
            });
        }

        let debtTotalSum = 0;
        let debtInstallmentCounter = 1;

        // Recorrer las columnas impares asumiendo quincenas (Aprox 24 ciclos = 12 meses)
        // Enero Q1: index 3, Enero Q2: index 5, Feb Q1: 7, ... Dic Q2: 49
        let monthAcc = 0; // 0 = Enero, 1 = Feb...
        let quincena = 0; // 0 = Q1, 1 = Q2

        for (let colIndex = 3; colIndex <= 49; colIndex += 2) {
            if (monthAcc > 11) break; // Terminan los 12 meses

            const cellValue = row[colIndex];
            const amount = typeof cellValue === 'number' ? cellValue : 0;

            if (amount > 0) {
                // Determinar fecha de la cuota (Día 5 o 20 según Q1/Q2)
                const dateDay = quincena === 0 ? 5 : 20;
                const txDate = new Date(currentYear, monthAcc, dateDay);

                if (isDebt && dbDebt) {
                    debtTotalSum += amount;
                    await prisma.installment.create({
                        data: {
                            debtId: dbDebt.id,
                            installmentNum: debtInstallmentCounter,
                            totalInstallments: 0, // Placeholder
                            amount: amount,
                            dueDate: txDate,
                            isPaid: txDate < new Date(), // Simular: se pagó si pasó la fecha
                        }
                    });
                    debtInstallmentCounter++;
                } else {
                    // Gasto recurrente (EPS, Pensión, Admin)
                    await prisma.transaction.create({
                        data: {
                            amount: amount,
                            currency: Currency.COP,
                            type: TransactionType.EXPENSE,
                            date: txDate,
                            description: itemName,
                            categoryId: fixedCategory.id,
                            isRecurring: true,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    });
                }
            }

            quincena++;
            if (quincena > 1) {
                quincena = 0;
                monthAcc++;
            }
        }

        // Actualizar totales de la deuda simulada
        if (isDebt && dbDebt) {
            await prisma.debt.update({
                where: { id: dbDebt.id },
                data: { totalAmount: debtTotalSum }
            });
            // Update del contador de Installments
            await prisma.installment.updateMany({
                where: { debtId: dbDebt.id },
                data: { totalInstallments: debtInstallmentCounter - 1 }
            });
        }
    }

    console.log('Seed exitoso. Los datos han sido guardados.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
