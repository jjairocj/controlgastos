import { db } from '../src/lib/db';

async function main() {
    console.log('Iniciando limpieza de base de datos para contabilidad de Marzo...');

    // 1. Borrar movimientos (Transferencias y Transacciones)
    console.log('Borrando transacciones y transferencias...');
    await db.transfer.deleteMany();
    await db.transaction.deleteMany();

    // 2. Borrar compromisos (Deudas y Cuotas) para empezar de cero
    console.log('Borrando deudas y cuotas...');
    await db.installment.deleteMany();
    await db.debt.deleteMany();

    // 3. Restablecer saldos de cuentas a 0
    console.log('Restableciendo saldos de cuentas a 0...');
    await db.account.updateMany({
        data: { balance: 0 }
    });

    console.log('---');
    console.log('¡Base de datos lista! Las cuentas y categorías se han mantenido.');
    console.log('Ahora puedes registrar tus ingresos y gastos de Marzo manualmente.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
