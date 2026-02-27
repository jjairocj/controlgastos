"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AccountType } from "@prisma/client";

export type UpdateAccountInput = {
    id: string;
    name?: string;
    type?: AccountType;
    creditLimit?: number | null;
    balance?: number;
};

export async function updateAccount(data: UpdateAccountInput) {
    try {
        await db.account.update({
            where: { id: data.id },
            data: {
                name: data.name,
                type: data.type,
                creditLimit: data.creditLimit,
                balance: data.balance,
            },
        });

        revalidatePath("/deudas");
        revalidatePath("/");
        revalidatePath("/transacciones");

        return { success: true };
    } catch (error) {
        console.error("Error al actualizar cuenta:", error);
        return { success: false, error: "No se pudo actualizar la cuenta." };
    }
}
