"use server";

import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function verifyPin(formData: FormData) {
    const pin = formData.get("pin") as string;
    const correctPin = process.env.APP_PIN || "1234";

    if (pin === correctPin) {
        const cookieStore = await cookies();
        cookieStore.set("auth-token", "authenticated", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30, // 30 días
            path: "/",
        });
        redirect("/");
    }

    return { error: "PIN incorrecto" };
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("auth-token");
    redirect("/login");
}
