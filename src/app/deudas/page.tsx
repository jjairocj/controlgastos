import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayInstallmentModal } from "@/components/debts/pay-installment-modal";
import { AddDebtModal } from "@/components/debts/add-debt-modal";
import { DeleteDebtButton } from "@/components/debts/delete-debt-button";
import { EditDebtModal } from "@/components/debts/edit-debt-modal";
import { EditAccountModal } from "@/components/accounts/edit-account-modal";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/lib/db";

export default async function DeudasPage() {
  const debts = await db.debt.findMany({
    include: {
      installments: {
        orderBy: { dueDate: "asc" }
      }
    }
  });

  const debtStats = debts.map(debt => {
    const totalCuotas = debt.installments.length;
    const cuotasPagadas = debt.installments.filter(i => i.isPaid).length;
    const sumTotal = debt.installments.reduce((acc, curr) => acc + curr.amount, 0);
    const sumPaid = debt.installments.filter(i => i.isPaid).reduce((acc, curr) => acc + curr.amount, 0);
    const nextInstallment = debt.installments.find(i => !i.isPaid);
    
    return {
      ...debt,
      totalCuotas,
      cuotasPagadas,
      sumTotal,
      sumPaid,
      nextInstallment,
      progress: totalCuotas > 0 ? (cuotasPagadas / totalCuotas) * 100 : 0
    };
  });

  // Mapa de Pago Sugerido por Cuenta (Suma de todas las cuotas del mes vinculadas a esa cuenta)
  const suggestedPaymentsByAccount: Record<string, number> = {};
  debtStats.forEach(debt => {
    const accId = (debt as any).accountId;
    if (accId && debt.nextInstallment) {
      suggestedPaymentsByAccount[accId] = (suggestedPaymentsByAccount[accId] || 0) + debt.nextInstallment.amount;
    }
  });

  const accounts = await db.account.findMany({
    select: { id: true, name: true, currency: true, type: true, creditLimit: true, balance: true },
    orderBy: { name: "asc" }
  });

  let debtCategory = await db.category.findFirst({ where: { name: "Pago de Deudas" } });
  if (!debtCategory) {
    debtCategory = await db.category.create({
      data: { name: "Pago de Deudas", type: "VARIABLE" }
    });
  }

  const globalTotal = debtStats.reduce((acc, curr) => acc + curr.sumTotal, 0);
  const globalPaid = debtStats.reduce((acc, curr) => acc + curr.sumPaid, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestor de Deudas</h1>
          <p className="text-muted-foreground mt-2">
            Sigue el progreso de tus obligaciones financieras y visualiza tu ruta hacia la libertad financiera.
          </p>
        </div>
        <AddDebtModal accounts={accounts as any} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deuda Total Consolidada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(globalTotal - globalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por pagar (Capital e Intereses previstos)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progreso Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {globalTotal > 0 ? ((globalPaid / globalTotal) * 100).toFixed(1) : 0}%
            </div>
            <Progress value={globalTotal > 0 ? (globalPaid / globalTotal) * 100 : 0} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Tus Tarjetas de Crédito (Saldómetros)</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.filter(a => a.type === "CREDIT_CARD").map(acc => {
          const usedCredit = debtStats
            .filter(d => (d as any).accountId === acc.id)
            .reduce((sum, d) => sum + (d.sumTotal - d.sumPaid), 0);
          
          const limit = acc.creditLimit || 0;
          const available = limit - usedCredit;
          const percentUsed = limit > 0 ? (usedCredit / limit) * 100 : 0;
          const monthlyPayment = suggestedPaymentsByAccount[acc.id] || 0;

          return (
            <Card key={acc.id} className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex justify-between items-center">
                  <span>{acc.name}</span>
                  <div className="flex items-center gap-1">
                    <EditAccountModal account={acc as any} />
                    <Badge variant="secondary" className="text-[10px]">{acc.currency}</Badge>
                  </div>
                </CardTitle>
                <CardDescription>Cupo Total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: acc.currency, maximumFractionDigits: 0 }).format(limit)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span>Uso del Cupo</span>
                    <span className={percentUsed > 80 ? "text-destructive" : "text-primary"}>{percentUsed.toFixed(1)}%</span>
                  </div>
                  <Progress value={percentUsed} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/10">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Disponible</span>
                    <span className="text-sm font-semibold text-emerald-500">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: acc.currency, maximumFractionDigits: 0 }).format(available)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Gasto Mes (Extracto)</span>
                    <span className="text-sm font-semibold text-primary">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: acc.currency, maximumFractionDigits: 0 }).format(monthlyPayment)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {accounts.filter(a => a.type === "CREDIT_CARD").length === 0 && (
          <div className="col-span-full py-8 text-center text-muted-foreground border rounded-xl border-dashed bg-muted/20">
            No tienes tarjetas de crédito configuradas para rastrear cupo.
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Detalle de Compras y Préstamos</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {debtStats.map(debt => (
          <Card key={debt.id} className="group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg truncate">{debt.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <EditDebtModal 
                        debtId={debt.id} 
                        initialName={debt.name} 
                        initialTotalAmount={debt.totalAmount} 
                        initialDisbursementAmount={(debt as any).disbursementAmount}
                        initialDisbursementDate={(debt as any).disbursementDate}
                        initialTEA={(debt as any).effectiveAnnualRate}
                        initialTotalInstallments={debt.installments[0]?.totalInstallments || 0}
                        initialAverageInstallmentAmount={debt.installments[0]?.amount || 0}
                        initialPaidInstallments={debt.cuotasPagadas}
                        initialNextPaymentDate={debt.nextInstallment?.dueDate}
                        initialAccountId={(debt as any).accountId}
                        accounts={accounts as any}
                        currency={debt.currency}
                        type={debt.type}
                      />
                      <DeleteDebtButton debtId={debt.id} debtName={debt.name} />
                    </div>
                  </div>
                  <CardDescription className="mt-1 flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground/70">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: debt.currency, maximumFractionDigits: 0 }).format(debt.sumTotal)} Total a Pagar
                    </span>
                    {(debt as any).disbursementAmount && (
                      <span className="text-xs text-muted-foreground italic">
                        Monto Aprobado: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: debt.currency, maximumFractionDigits: 0 }).format((debt as any).disbursementAmount)}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="mt-2">
                <Badge variant={debt.progress === 100 ? "default" : "outline"} className={debt.progress === 100 ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : ""}>
                  {debt.cuotasPagadas}/{debt.totalCuotas} Cuotas Pagadas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium mb-2 opacity-80 flex justify-between">
                <span>Progreso</span>
                <span>{debt.progress.toFixed(0)}%</span>
              </div>
              <Progress value={debt.progress} className="h-2 mb-4" />
              
              <div className="flex justify-between items-center text-xs text-muted-foreground bg-muted/50 p-2 rounded-md mb-4">
                <span>Saldo Pendiente (Proyectado):</span>
                <span className="font-mono font-medium text-destructive">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: debt.currency, maximumFractionDigits: 0 }).format(debt.sumTotal - debt.sumPaid)}
                </span>
              </div>
              
              {(debt as any).disbursementAmount && (debt as any).effectiveAnnualRate && (
                <div className="flex justify-between items-center text-xs text-muted-foreground bg-warning/5 border border-warning/20 p-2 rounded-md mb-4">
                  <div className="flex flex-col">
                    <span className="text-warning font-semibold">Tasa Efectiva Anual (TEA): {((debt as any).effectiveAnnualRate * 100).toFixed(2)}%</span>
                    <span>Interés Original Calculado: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: debt.currency, maximumFractionDigits: 0 }).format(debt.sumTotal - (debt as any).disbursementAmount)}</span>
                  </div>
                </div>
              )}
              
              {debt.nextInstallment && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm">
                      <span className="font-semibold text-foreground">Cuota {debt.nextInstallment.installmentNum}</span>
                      <span className="text-muted-foreground ml-2 text-xs">Vence: {format(debt.nextInstallment.dueDate, "dd MMM", { locale: es })}</span>
                    </div>
                    <span className="font-mono font-bold">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: debt.currency, maximumFractionDigits: 0 }).format(debt.nextInstallment.amount)}
                    </span>
                  </div>
                  <PayInstallmentModal
                    installmentId={debt.nextInstallment.id}
                    debtName={debt.name}
                    currency={debt.currency}
                    expectedAmount={debt.nextInstallment.amount}
                    suggestedPaymentAmount={(debt as any).accountId ? suggestedPaymentsByAccount[(debt as any).accountId] : undefined}
                    dueDate={debt.nextInstallment.dueDate}
                    accounts={accounts as any}
                    categoryId={debtCategory.id}
                  >
                    <button className="w-full mt-2 bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-sm font-medium py-2 rounded-md ring-1 ring-inset ring-primary/20">
                      Registrar Pago
                    </button>
                  </PayInstallmentModal>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {debtStats.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-xl border-dashed">
            No tienes deudas registradas. ¡Excelente trabajo!
          </div>
        )}
      </div>
      
      {/* Sección Estrategias */}
      {debtStats.length > 0 && (
        <Card className="mt-8 border-primary/20 bg-background shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex justify-between items-center">
              <span>💡 Estrategia Sugerida: &quot;Bola de Nieve&quot;</span>
            </CardTitle>
            <CardDescription>
              Para liberar flujo de caja rápido y motivarte a cada mes reducir mis deudas.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-foreground/80 space-y-4 leading-relaxed">
            <p>
              El método bola de nieve consiste en <strong>ordenar tus deudas de menor a mayor saldo</strong>. 
              En FinanzasTracker simulamos esta estrategia priorizando la deuda que estás más cerca de cancelar:
            </p>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <h4 className="font-semibold text-primary mb-2">Plan de Acción de este mes:</h4>
              <ul className="list-disc list-inside space-y-2 marker:text-primary">
                <li>Paga el <strong>mínimo estricto</strong> de todas tus obligaciones grandes.</li>
                <li>Si lograste un &quot;Saldo Libre&quot; en tu quincena (ver Dashboard), abona <strong>absolutamente todo ese extra</strong> a: 
                  <span className="ml-2 px-2 py-0.5 rounded bg-primary text-primary-foreground font-mono font-medium">
                    {debtStats.sort((a,b) => (a.sumTotal - a.sumPaid) - (b.sumTotal - b.sumPaid))[0]?.name || "Deuda Menor"}
                  </span>
                </li>
                <li>Una vez liquidada la menor, el flujo de caja que usabas allí, lo sumas al mínimo de la segunda deuda. El efecto se acelera mes a mes.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
