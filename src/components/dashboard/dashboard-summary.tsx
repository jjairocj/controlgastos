import { db } from "@/lib/db";

interface DashboardSummaryProps {
  period?: "Q1" | "Q2";
}

export default async function DashboardSummary({ period }: DashboardSummaryProps) {
  // Configurar las fechas base para el mes actual
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let dateFilter = {};
  if (period === "Q1") {
    dateFilter = { gte: new Date(year, month, 1), lt: new Date(year, month, 16) };
  } else if (period === "Q2") {
    dateFilter = { gte: new Date(year, month, 16), lt: new Date(year, month + 1, 1) };
  } else {
    dateFilter = { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) };
  }

  // 1. Gastos en Deuda
  const gastosDeuda = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { 
      type: "EXPENSE", 
      date: dateFilter,
      installmentId: { not: null }
    }
  });

  // 2. Gastos Fijos (que no sean pago de deuda)
  const gastosFijos = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { 
      type: "EXPENSE", 
      date: dateFilter,
      installmentId: null, // Excluimos deudas porque ya están arriba
      category: { type: "FIXED" }
    }
  });

  // 3. Gastos Variables
  const gastosVariables = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { 
      type: "EXPENSE", 
      date: dateFilter,
      category: { type: "VARIABLE" }
    }
  });

  const sumDeudas = gastosDeuda._sum.amount || 0;
  const sumFijos = gastosFijos._sum.amount || 0;
  const sumVariables = gastosVariables._sum.amount || 0;

  // 4. Saldos Reales en Bancos (Efectivo/Ahorros, ignorando el cupo de la tarjeta de crédito)
  const accounts = await db.account.findMany();
  
  const saldoCOP = accounts
    .filter(a => a.currency === "COP" && a.type === "SAVINGS")
    .reduce((acc, curr) => acc + curr.balance, 0);

  const saldoUSD = accounts
    .filter(a => a.currency === "USD" && a.type === "SAVINGS")
    .reduce((acc, curr) => acc + curr.balance, 0);

  const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-sm">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-semibold">Tus Dólares (USD)</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{fmtUSD.format(saldoUSD)}</div>
          <p className="text-[10px] text-emerald-500/70 mt-1">Efectivo total en dólares</p>
        </div>
      </div>
      <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-sm">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-semibold">Tus Pesos (COP)</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{fmtCOP.format(saldoCOP)}</div>
          <p className="text-[10px] text-emerald-500/70 mt-1">Efectivo total en pesos</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Gastos en Deuda</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{fmtCOP.format(sumDeudas)}</div>
          <p className="text-xs text-muted-foreground mt-1">Acumulado {period || "Mes"}</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Gastos Fijos</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{fmtCOP.format(sumFijos)}</div>
          <p className="text-xs text-muted-foreground mt-1">Acumulado {period || "Mes"}</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Gastos Variables</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{fmtCOP.format(sumVariables)}</div>
          <p className="text-xs text-muted-foreground mt-1">Acumulado {period || "Mes"}</p>
        </div>
      </div>
    </div>
  );
}

