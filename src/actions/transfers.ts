"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Currency, TransactionType } from "@prisma/client";

export type CreateTransferInput = {
    fromAccountId: string;
    toAccountId: string;
    amountSource: number; // e.g., 1739.80 USD
    amountDest: number;   // e.g., 6.5M COP
    exchangeRate: number; // TRM
    description?: string;
    date: Date;
};

export async function createTransfer(data: CreateTransferInput) {
    try {
        // Ejecutar todo en una transacción de base de datos para asegurar integridad
        const result = await db.$transaction(async (tx) => {
            // 1. Crear el objeto Transfer
            const transfer = await tx.transfer.create({
                data: {
                    fromAccountId: data.fromAccountId,
                    toAccountId: data.toAccountId,
                    amountSource: data.amountSource,
                    amountDest: data.amountDest,
                    exchangeRate: data.exchangeRate,
                    description: data.description,
                    date: data.date,
                }
            });

            // 2. Obtener detalles de las cuentas para saber sus monedas
            const fromAccount = await tx.account.findUniqueOrThrow({ where: { id: data.fromAccountId } });
            const toAccount = await tx.account.findUniqueOrThrow({ where: { id: data.toAccountId } });

            // 3. Crear Transacción de SALIDA (Gasto)
            await tx.transaction.create({
                data: {
                    amount: data.amountSource,
                    currency: fromAccount.currency,
                    type: "EXPENSE",
                    date: data.date,
                    description: `Transferencia a ${toAccount.name}: ${data.description || ''}`,
                    accountId: data.fromAccountId,
                    transferId: transfer.id,
                    categoryId: (await tx.category.findFirst({ where: { name: "Transferencias" } }))?.id || (await tx.category.findFirst())!.id,
                }
            });

            // 4. Crear Transacción de ENTRADA (Ingreso)
            await tx.transaction.create({
                data: {
                    amount: data.amountDest,
                    currency: toAccount.currency,
                    type: "INCOME",
                    date: data.date,
                    description: `Transferencia desde ${fromAccount.name}: ${data.description || ''}`,
                    accountId: data.toAccountId,
                    transferId: transfer.id,
                    categoryId: (await tx.category.findFirst({ where: { name: "Transferencias" } }))?.id || (await tx.category.findFirst())!.id,
                }
            });

            // 5. Actualizar Balances de las cuentas
            await tx.account.update({
                where: { id: data.fromAccountId },
                data: { balance: { decrement: data.amountSource } }
            });

            await tx.account.update({
                where: { id: data.toAccountId },
                data: { balance: { increment: data.amountDest } }
            });

            return transfer;
        });

        revalidatePath("/");
        revalidatePath("/transacciones");
        return { success: true, transfer: result };
    } catch (error) {
        console.error("Error al crear transferencia:", error);
        return { success: false, error: "Error al procesar la transferencia bancaria." };
    }
}
