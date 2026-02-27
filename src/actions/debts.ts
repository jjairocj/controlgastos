"use server";

import { revalidatePath } from "next/cache";
import { Currency, DebtType } from "@prisma/client";
import { db } from "@/lib/db";
import { addMonths } from "date-fns";

export type CreateDebtInput = {
    name: string;
    type: DebtType;
    totalAmount: number;
    currency: Currency;
    totalInstallments: number;
    averageInstallmentAmount: number;
    startDate: Date;
    // Datos de causación original e histórica
    disbursementAmount?: number;
    disbursementDate?: Date;
    paidInstallments?: number;
    accountId?: string;
};

export async function createDebt(data: CreateDebtInput) {
    try {
        const result = await db.$transaction(async (tx) => {
            // Tasa Efectiva Anual Estimada (Newton-Raphson para Anualidad/Crédito Francés)
            let estimatedTEA = null;
            if (data.disbursementAmount && data.averageInstallmentAmount && data.totalInstallments > 0) {
                const P = data.disbursementAmount;
                const PMT = data.averageInstallmentAmount;
                const n = data.totalInstallments;

                // Resolver R para: PMT = P * [R(1+R)^n] / [(1+R)^n - 1]
                // Aproximación inicial (Tasa nominal simple)
                let r = (PMT * n / P - 1) / n;

                for (let i = 0; i < 20; i++) {
                    const pow = Math.pow(1 + r, n);
                    const f = PMT * (pow - 1) / (r * pow) - P;
                    const df = PMT * ((1 - Math.pow(1 + r, -n)) / (r * r) - n * Math.pow(1 + r, -n - 1) / r);

                    const nextR = r - f / (-df); // df suele ser negativo, aquí ajustamos signo
                    if (Math.abs(nextR - r) < 0.00001) {
                        r = nextR;
                        break;
                    }
                    r = nextR;
                }

                if (r > 0) {
                    estimatedTEA = Math.pow(1 + r, 12) - 1;
                }
            }

            // Normalizar fecha a mediodía local para evitar saltos de zona horaria al guardar/formatear
            const normalizedStartDate = new Date(data.startDate);
            normalizedStartDate.setHours(12, 0, 0, 0);

            const debt = await tx.debt.create({
                data: {
                    name: data.name,
                    type: data.type,
                    totalAmount: data.totalAmount,
                    currency: data.currency,
                    accountId: data.accountId || null,
                    disbursementAmount: (data as any).disbursementAmount || null,
                    disbursementDate: (data as any).disbursementDate || null,
                    effectiveAnnualRate: estimatedTEA,
                } as any,
            });

            // Crear las cuotas estimadas
            const paidCount = data.paidInstallments || 0;

            for (let i = 1; i <= data.totalInstallments; i++) {
                // Las cuotas ya pagadas quedan seteadas en true
                const isPaidHistoric = i <= paidCount;

                // Cálculo de Fecha:
                // El usuario provee "startDate" como la fecha en que planea pagar O pagó su *primera cuota pendiente real en la App*.
                // Si la cuota "i" es histórica (mayor a 0 pero <= paidCount), le asignamos una fecha en el pasado
                // restando meses desde la fecha ingresada como `startDate` para la primera cuota pendiente.
                // Si es futura (mayor a paidCount), le sumamos los meses correspondientes.

                // El Offset (diferencia en meses) se calcula base a la primera cuota "por pagar" (que es paidCount + 1).
                const monthOffset = i - (paidCount + 1);
                const calculatedDueDate = addMonths(normalizedStartDate, monthOffset);

                await tx.installment.create({
                    data: {
                        debtId: debt.id,
                        installmentNum: i,
                        totalInstallments: data.totalInstallments,
                        amount: data.averageInstallmentAmount,
                        dueDate: calculatedDueDate,
                        isPaid: isPaidHistoric,
                    }
                });
            }

            return debt;
        });

        revalidatePath("/deudas");
        revalidatePath("/checklist");
        revalidatePath("/");

        return { success: true, debt: result };
    } catch (error) {
        console.error("Error al crear deuda:", error);
        return { success: false, error: "Hubo un error al registrar la deuda." };
    }
}

export async function deleteDebt(id: string) {
    try {
        await db.debt.delete({
            where: { id },
        });

        revalidatePath("/deudas");
        revalidatePath("/checklist");
        revalidatePath("/");

        return { success: true };
    } catch (error) {
        console.error("Error al eliminar deuda:", error);
        return { success: false, error: "No se pudo eliminar la deuda. Verifica que no tenga pagos ya procesados que bloqueen el borrado." };
    }
}

export type EditDebtInput = {
    id: string;
    name: string;
    type: DebtType;
    totalAmount: number;
    currency: Currency;
    totalInstallments?: number;
    averageInstallmentAmount?: number;
    paidInstallments?: number;
    nextPaymentDate?: Date;
    disbursementAmount?: number;
    disbursementDate?: Date;
    effectiveAnnualRate?: number;
    accountId?: string;
};

export async function editDebt(data: EditDebtInput) {
    try {
        await db.$transaction(async (tx) => {
            // 1. Obtener la deuda actual
            const currentDebt = await tx.debt.findUnique({
                where: { id: data.id },
                include: { installments: { orderBy: { installmentNum: "asc" } } }
            });

            if (!currentDebt) throw new Error("Deuda no encontrada");

            // 2. Recalcular TEA si es necesario/posible
            let updatedTEA = data.effectiveAnnualRate;
            const finalPMT = data.averageInstallmentAmount || (currentDebt.installments[0]?.amount || 0);
            const finalN = data.totalInstallments || currentDebt.installments.length;
            const finalP = data.disbursementAmount || (currentDebt as any).disbursementAmount;

            if (finalP && finalPMT && finalN > 0 && !data.effectiveAnnualRate) {
                // Newton-Raphson para TEA (mismo algoritmo que en createDebt)
                const P = finalP;
                const PMT = finalPMT;
                const n = finalN;
                let r = (PMT * n / P - 1) / n;
                for (let i = 0; i < 20; i++) {
                    const pow = Math.pow(1 + r, n);
                    const f = PMT * (pow - 1) / (r * pow) - P;
                    const df = PMT * ((1 - Math.pow(1 + r, -n)) / (r * r) - n * Math.pow(1 + r, -n - 1) / r);
                    const nextR = r - f / (-df);
                    if (Math.abs(nextR - r) < 0.00001) { r = nextR; break; }
                    r = nextR;
                }
                if (r > 0) updatedTEA = Math.pow(1 + r, 12) - 1;
            }

            // 3. Actualizar datos básicos de la deuda
            await tx.debt.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    type: data.type,
                    totalAmount: data.totalAmount,
                    currency: data.currency,
                    accountId: data.accountId || null,
                    disbursementAmount: (data as any).disbursementAmount || null,
                    disbursementDate: (data as any).disbursementDate || null,
                    effectiveAnnualRate: updatedTEA || null,
                } as any,
            });

            // 4. Gestión Integral de Cuotas (Sincronización Total)
            const needsRegeneration =
                data.totalInstallments !== undefined ||
                data.averageInstallmentAmount !== undefined ||
                data.paidInstallments !== undefined ||
                data.nextPaymentDate !== undefined;

            if (needsRegeneration) {
                const finalTotalInstallments = data.totalInstallments ?? currentDebt.installments.length;
                const finalPaidCount = data.paidInstallments ?? currentDebt.installments.filter(i => i.isPaid).length;
                const finalAvgAmount = data.averageInstallmentAmount ?? (currentDebt.installments[0]?.amount || 0);

                let normalizedNextDate: Date;
                if (data.nextPaymentDate) {
                    normalizedNextDate = new Date(data.nextPaymentDate);
                } else {
                    const nextPending = currentDebt.installments.find(i => !i.isPaid);
                    normalizedNextDate = nextPending ? new Date(nextPending.dueDate) : new Date();
                }
                normalizedNextDate.setHours(12, 0, 0, 0);

                // Borramos TODAS las cuotas para reconstruir el calendario
                await tx.installment.deleteMany({
                    where: { debtId: data.id }
                });

                // Reconstruir calendario
                for (let i = 1; i <= finalTotalInstallments; i++) {
                    const isPaid = i <= finalPaidCount;
                    const monthOffset = i - (finalPaidCount + 1);
                    const calculatedDueDate = addMonths(normalizedNextDate, monthOffset);

                    await tx.installment.create({
                        data: {
                            debtId: data.id,
                            installmentNum: i,
                            totalInstallments: finalTotalInstallments,
                            amount: finalAvgAmount,
                            dueDate: calculatedDueDate,
                            isPaid: isPaid,
                        }
                    });
                }
            }
        });

        revalidatePath("/deudas");
        revalidatePath("/checklist");
        revalidatePath("/");

        return { success: true };
    } catch (error) {
        console.error("Error al editar deuda:", error);
        return { success: false, error: "Hubo un error al actualizar la deuda." };
    }
}
