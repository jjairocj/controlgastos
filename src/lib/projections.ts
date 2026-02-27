import { db } from "@/lib/db";
import { addDays, startOfMonth, endOfMonth, isWithinInterval, addMonths } from "date-fns";

export type ProjectionPeriod = {
    name: string;
    startBalance: number;
    income: number;
    expenses: number;
    debt: number;
    endBalance: number;
    startDate: Date;
    endDate: Date;
};

export async function getProjections(): Promise<ProjectionPeriod[]> {
    const now = new Date();
    // Siempre empezamos proyecciones desde Marzo 2026 (según contexto del usuario)
    // O mejor, desde el mes actual relativo a "ahora"
    const baseDate = new Date(2026, 2, 1); // 1 de Marzo 2026

    const settings = await db.userSettings.findFirst();
    // TODO: Usar la ExchangeRate más reciente de la DB
    const trm = 4000;

    // 1. Obtener Saldo Inicial Real (Cuentas Banco)
    const accounts = await db.account.findMany();
    let currentCashCOP = 0;
    for (const acc of accounts) {
        if (acc.currency === "USD") {
            currentCashCOP += acc.balance * trm;
        } else {
            currentCashCOP += acc.balance;
        }
    }

    // 2. Transacciones PENDING (Causadas pero no pagadas)
    const pendingTransactions = await db.transaction.findMany({
        where: { status: "PENDING" }
    });

    // 3. Cuotas de deudas no pagadas
    const futureInstallments = await db.installment.findMany({
        where: { isPaid: false },
        include: { debt: true }
    });

    // 4. Plantillas Recurrentes activas (Gas, Servicios, Sueldo) para proyectar
    const activeRecurringItems = await db.recurringItem.findMany({
        where: { active: true }
    });

    const periods: ProjectionPeriod[] = [];
    let runningBalance = currentCashCOP;

    // Generar 4 periodos (2 meses, 4 quincenas)
    for (let m = 0; m < 2; m++) {
        const monthStart = addMonths(baseDate, m);

        // Q1: del 1 al 15
        const q1Start = monthStart;
        const q1End = addDays(monthStart, 14);

        // Q2: del 16 al fin de mes
        const q2Start = addDays(monthStart, 15);
        const q2End = endOfMonth(monthStart);

        [
            { name: `${monthStart.toLocaleDateString('es-ES', { month: 'long' })} - Q1`, start: q1Start, end: q1End },
            { name: `${monthStart.toLocaleDateString('es-ES', { month: 'long' })} - Q2`, start: q2Start, end: q2End }
        ].forEach(p => {
            // INGRESOS: Sumar los PENDING que vencen en este periodo + 
            // Estimaciones Recurrentes si no hay PENDING ya registrado para este item.
            // Para simplificar, la estimación base de la quincena.
            let periodIncome = 0;
            let periodExpenses = 0;

            // Recorrer transferencias PENDING
            pendingTransactions.forEach(tx => {
                const txDate = tx.dueDate || tx.date;
                if (isWithinInterval(txDate, { start: p.start, end: p.end })) {
                    const amountCOP = tx.currency === 'USD' ? tx.amount * trm : tx.amount;
                    if (tx.type === 'INCOME') periodIncome += amountCOP;
                    if (tx.type === 'EXPENSE') periodExpenses += amountCOP;
                }
            });

            // Recorrer Recurrentes (Estimados extras)
            // Lógica asume que toda quincena recibe el baseIncome / 2, esto permite
            // proyectar al futuro incluso si el usuario no ha puesto la factura "PENDING" del sueldo de Julio.
            // Si el user tiene "baseIncome" en UserSettings, sumémoslo
            // Pero según la nueva instrucción "jugar con capturar los ingresos... decir x entro":
            // Si hay un income PENDING, usamos ese, si no, usamos el baseIncome
            if (periodIncome === 0 && settings?.baseIncome) {
                periodIncome += ((settings.baseIncome * trm) / 2); // Quincena
            }

            // Sumar cuotas de deuda
            const periodDebt = futureInstallments
                .filter(inst => isWithinInterval(inst.dueDate, { start: p.start, end: p.end }))
                .reduce((acc, curr) => acc + (curr.debt.currency === 'USD' ? curr.amount * trm : curr.amount), 0);

            let periodStartBalance = runningBalance;
            let periodEndBalance = periodStartBalance + periodIncome - periodExpenses - periodDebt;

            periods.push({
                name: p.name,
                startBalance: periodStartBalance,
                income: periodIncome,
                expenses: periodExpenses,
                debt: periodDebt,
                endBalance: periodEndBalance,
                startDate: p.start,
                endDate: p.end
            });

            // Arrastrar el saldo final al saldo inicial de la próxima quincena
            runningBalance = periodEndBalance;
        });
    }

    return periods;
}
