import { PrismaClient } from "@prisma/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayInstallmentModal } from "@/components/debts/pay-installment-modal";
import { ReceiveInvoiceModal } from "@/components/debts/receive-invoice-modal";
import { PayPendingModal } from "@/components/debts/pay-pending-modal";
import { Clock, CheckCircle2, RefreshCcw } from "lucide-react";

import { db } from "@/lib/db";

export default async function ChecklistPage() {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // 1. Transacciones PENDING (Ya causadas, esperando pago)
  const pendingTransactions = await db.transaction.findMany({
    where: { 
      status: "PENDING",
      date: { lte: monthEnd } // Vencen este mes o antes
    },
    orderBy: { dueDate: 'asc' },
    include: { category: true }
  });

  // 2. Cuotas de deudas (Esperando pago)
  const pendingInstallments = await db.installment.findMany({
    where: {
      isPaid: false,
      dueDate: { lte: monthEnd } 
    },
    include: { debt: true },
    orderBy: { dueDate: 'asc' }
  });

  // 3. Plantillas Recurrentes (Para generación manual)
  // En este prototipo mostraremos todas las activas, el usuario decide si "Causar"
  const recurringItems = await db.recurringItem.findMany({
    where: { active: true },
    include: { category: true }
  });

  // 4. Todo lo PAGADO este mes (isRecurring true o installment paid)
  // No traemos TODO el historial, solo lo marcado como recurrente/factura pagada este mes
  const paidTransactions = await db.transaction.findMany({
    where: {
      status: "PAID",
      date: { gte: monthStart, lte: monthEnd },
      OR: [
        { isRecurring: true },
        { installmentId: { not: null } }
      ]
    },
    include: { category: true }
  });

  const accounts = await db.account.findMany({
    select: { id: true, name: true, currency: true },
    orderBy: { name: "asc" }
  });
  
  let debtCategory = await db.category.findFirst({ where: { name: "Pago de Deudas" } });
  if (!debtCategory) {
    debtCategory = await db.category.create({ data: { name: "Pago de Deudas", type: "VARIABLE" } });
  }

  const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  const totalPending = pendingTransactions.reduce((acc, tx) => acc + tx.amount, 0) + 
                       pendingInstallments.reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cuentas por Pagar (Causación)</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tus facturas del mes: {format(today, "MMMM yyyy", { locale: es })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* COLUMNA 1: Plantillas (Esperando Factura) */}
        <Card className="border-dashed bg-muted/30">
          <CardHeader className="pb-3 border-b border-dashed mb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <RefreshCcw className="w-4 h-4" />
              Suscripciones / Plantillas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {recurringItems.map(item => (
              <div key={item.id} className="p-3 bg-card border rounded-lg hover:border-primary/40 transition-colors text-sm">
                <div className="font-semibold">{item.name}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-muted-foreground font-mono">{item.currency === 'COP' ? fmtCOP.format(item.defaultAmount) : fmtUSD.format(item.defaultAmount)}</span>
                  <Badge variant="outline" className="text-[10px]">{item.period}</Badge>
                </div>
                <div className="mt-3">
                  <ReceiveInvoiceModal
                    recurringItemId={item.id}
                    name={item.name}
                    currency={item.currency as any}
                    expectedAmount={item.defaultAmount}
                    type={item.type as any}
                    categoryId={item.categoryId}
                  >
                    <button className="w-full text-xs bg-muted hover:bg-muted-foreground/10 py-1.5 rounded text-foreground font-medium transition-colors">
                      Recibir Factura / Causar
                    </button>
                  </ReceiveInvoiceModal>
                </div>
              </div>
            ))}
            {recurringItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No hay plantillas activas.</p>
            )}
          </CardContent>
        </Card>

        {/* COLUMNA 2: PENDING (Por Pagar) */}
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-3 border-b mb-2 bg-warning/10">
            <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-warning">
                <Clock className="w-4 h-4" />
                Pendientes de Pago
                </CardTitle>
                <span className="text-xs font-mono font-bold">{fmtCOP.format(totalPending)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {/* Listar PENDING tx */}
            {pendingTransactions.map(tx => (
              <div key={tx.id} className="p-3 bg-card border border-warning/20 shadow-sm rounded-lg text-sm">
                <div className="font-semibold">{tx.description}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-destructive font-mono font-medium">{tx.currency === 'COP' ? fmtCOP.format(tx.amount) : fmtUSD.format(tx.amount)}</span>
                  <span className="text-xs text-muted-foreground">Vence: {format(tx.dueDate || tx.date, "dd MMM", { locale: es })}</span>
                </div>
                <div className="mt-3">
                  <PayPendingModal
                    transactionId={tx.id}
                    name={tx.description}
                    currency={tx.currency as any}
                    expectedAmount={tx.amount}
                    dueDate={tx.dueDate || tx.date}
                    accounts={accounts}
                  >
                    <button className="w-full text-xs bg-primary/10 hover:bg-primary/20 text-primary py-1.5 rounded font-medium transition-colors">
                      Pagar Factura
                    </button>
                  </PayPendingModal>
                </div>
              </div>
            ))}

            {/* Listar Installments */}
            {pendingInstallments.map(inst => (
              <div key={inst.id} className="p-3 bg-card border border-warning/20 shadow-sm rounded-lg text-sm">
                <div className="font-semibold">{inst.debt.name} (Cuota {inst.installmentNum})</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-destructive font-mono font-medium">{inst.debt.currency === 'COP' ? fmtCOP.format(inst.amount) : fmtUSD.format(inst.amount)}</span>
                  <span className="text-xs text-muted-foreground">Vence: {format(inst.dueDate, "dd MMM", { locale: es })}</span>
                </div>
                <div className="mt-3">
                    <PayInstallmentModal
                        installmentId={inst.id}
                        debtName={inst.debt.name}
                        currency={inst.debt.currency}
                        expectedAmount={inst.amount}
                        dueDate={inst.dueDate}
                        accounts={accounts}
                        categoryId={debtCategory.id}
                    >
                        <button className="w-full text-xs bg-primary text-primary-foreground hover:bg-primary/90 py-1.5 rounded font-medium transition-colors">
                        Pagar Extracto / Cuota
                        </button>
                    </PayInstallmentModal>
                </div>
              </div>
            ))}

            {pendingTransactions.length === 0 && pendingInstallments.length === 0 && (
                 <p className="text-xs text-muted-foreground text-center py-4">Estás al día.</p>
            )}
          </CardContent>
        </Card>

        {/* COLUMNA 3: PAGADOS */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-3 border-b mb-2 bg-emerald-500/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Pagados Este Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
             {paidTransactions.map(tx => (
              <div key={tx.id} className="p-3 bg-card border border-emerald-500/20 opacity-70 grayscale-[30%] rounded-lg text-sm hover:grayscale-0 transition-all">
                <div className="font-semibold line-through decoration-emerald-500/50">{tx.description}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">{tx.currency === 'COP' ? fmtCOP.format(tx.amount) : fmtUSD.format(tx.amount)}</span>
                  <span className="text-xs text-muted-foreground">Pagado: {format(tx.date, "dd MMM", { locale: es })}</span>
                </div>
              </div>
            ))}
            {paidTransactions.length === 0 && (
                 <p className="text-xs text-muted-foreground text-center py-4">Aún no hay pagos.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
