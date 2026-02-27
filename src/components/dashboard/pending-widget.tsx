import { db } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock } from "lucide-react";

export default async function PendingWidget() {
    const pendingTransactions = await db.transaction.findMany({
        where: { status: "PENDING" },
        orderBy: { date: "asc" },
        include: { category: true }
    });

    if (pendingTransactions.length === 0) {
        return null; // Ocultar el widget si no hay nada pendiente
    }

    const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

    return (
        <Card className="border-warning/50 bg-warning/5 overflow-hidden">
            <CardHeader className="bg-warning/10 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning" />
                    Pendientes de Pago (Causación)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                    {pendingTransactions.map(tx => (
                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                            <div className="flex flex-col gap-1">
                                <span className="font-semibold">{tx.description}</span>
                                <span className="text-xs text-muted-foreground">
                                    {format(tx.dueDate || tx.date, "dd MMM yyyy", { locale: es })}
                                </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`font-mono font-medium ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-destructive'}`}>
                                    {tx.type === 'INCOME' ? '+' : '-'} {tx.currency === 'COP' ? fmtCOP.format(tx.amount) : fmtUSD.format(tx.amount)}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">
                                    {tx.category?.name || "Sin Categoría"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
