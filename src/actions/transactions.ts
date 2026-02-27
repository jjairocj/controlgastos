"use server";

import { revalidatePath } from "next/cache";
import { Currency, TransactionType, TransactionStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type CreateTransactionInput = {
    amount: number;
    currency: Currency;
    type: TransactionType;
    date: Date;
    description: string;
    categoryId: string;

    // Proyecciones y Causación
    status?: TransactionStatus;
    isRecurring?: boolean;
    recurringItemId?: string;
    dueDate?: Date;

    // Cuentas (NUEVO V2)
    accountId?: string;

    // Trazabilidad Multi-moneda (NUEVO)
    exchangeRate?: number;
    originalAmount?: number;
    originalCurrency?: Currency;

    // Deudas (Opcional)
    installmentId?: string;
};

export async function createTransaction(data: CreateTransactionInput) {
    try {
        const result = await db.$transaction(async (tx) => {
            const transaction = await tx.transaction.create({
                data: {
                    amount: data.amount,
                    currency: data.currency,
                    type: data.type,
                    date: data.date,
                    description: data.description,
                    categoryId: data.categoryId,
                    status: data.status || "PAID",
                    isRecurring: data.isRecurring || false,
                    recurringItemId: data.recurringItemId || null,
                    dueDate: data.dueDate || null,
                    installmentId: data.installmentId || null,
                    accountId: data.accountId || null,
                    exchangeRate: data.exchangeRate || null,
                    originalAmount: data.originalAmount || null,
                    originalCurrency: data.originalCurrency || null,
                },
            });

            // Si hay una cuenta vinculada y el estado es PAID (Causación Resuelta), actualizar saldo
            if (data.accountId && transaction.status === "PAID") {
                await tx.account.update({
                    where: { id: data.accountId },
                    data: {
                        balance: data.type === "INCOME"
                            ? { increment: data.amount }
                            : { decrement: data.amount }
                    }
                });
            }

            // Si la transacción está vinculada a una cuota y se pagó realmente
            if (data.installmentId && transaction.status === "PAID") {
                await tx.installment.update({
                    where: { id: data.installmentId },
                    data: { isPaid: true },
                });
            }

            return transaction;
        });

        // Invalidamos caché para refrescar UI
        revalidatePath("/");
        revalidatePath("/transacciones");
        revalidatePath("/checklist");

        return { success: true, transaction: result };
    } catch (error) {
        console.error("Error al crear transacción:", error);
        return { success: false, error: "Hubo un error al registrar el movimiento." };
    }
}

export async function getCategories() {
    return await db.category.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function getAccounts() {
    return await db.account.findMany({
        include: {
            _count: {
                select: { transactions: true, debts: true }
            }
        },
        orderBy: { name: 'asc' }
    });
}

export type PayPendingInput = {
    transactionId: string;
    accountId: string;
    amount: number;
    date: Date;
};

export async function payPendingTransaction(data: PayPendingInput) {
    try {
        const result = await db.$transaction(async (tx) => {
            const transaction = await tx.transaction.findUnique({
                where: { id: data.transactionId }
            });

            if (!transaction || transaction.status === "PAID") {
                throw new Error("Transacción no encontrada o ya pagada");
            }

            const updated = await tx.transaction.update({
                where: { id: data.transactionId },
                data: {
                    status: "PAID",
                    amount: data.amount,
                    date: data.date,
                    accountId: data.accountId,
                }
            });

            await tx.account.update({
                where: { id: data.accountId },
                data: {
                    balance: transaction.type === "INCOME"
                        ? { increment: data.amount }
                        : { decrement: data.amount }
                }
            });

            if (transaction.installmentId) {
                await tx.installment.update({
                    where: { id: transaction.installmentId },
                    data: { isPaid: true }
                });
            }

            return updated;
        });

        revalidatePath("/");
        revalidatePath("/transacciones");
        revalidatePath("/checklist");

        return { success: true, transaction: result };
    } catch (error: any) {
        console.error("Error al pagar transacción pendiente:", error);
        return { success: false, error: error.message || "Hubo un error al procesar el pago." };
    }
}
