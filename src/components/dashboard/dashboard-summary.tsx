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

  // TRM Dinámica Indicativa (Para visualización)
  let currentTRM = 4000;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      currentTRM = data.rates.COP || 4000;
    }
  } catch (error) {
    console.error("No se pudo obtener la TRM", error);
  }

  // Ingreso Base de Configuración (Asumimos que el input en web es COP directo)
  const config = await db.userSettings.findFirst();
  // Corregimos la inflación de 24M: el baseIncome debería tratarse como COP directo, 
  // O en su defecto, si es 6000 USD, lo multiplicamos por la TRM real indicativa.
  // Ajustaremos a que el baseIncome guardado es directamente en COP (Ej. 6000000) o aplicamos lógica.
  // En versiones previas baseIncome estaba en 6000 y se multiplicaba x4000 = 24M.
  // Vamos a asumir que si el baseIncome es menor a 100,000, está en USD y usamos la TRM real indicativa.
  const rawBase = config?.baseIncome || 6000000; // Default 6M COP si no hay config
  const incomeCopBase = rawBase < 100000 ? rawBase * currentTRM : rawBase;
  
  // Total Ingresos mes (Config + Extras Q1/Q2)
  const txIngresos = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { type: "INCOME", date: dateFilter }
  });
  
  // Asumir que el baseIncome se prorratea o se suma al Q1
  const baseIncomeAssigned = (!period || period === "Q1") ? incomeCopBase : 0;
  const totalIncome = baseIncomeAssigned + (txIngresos._sum.amount || 0);

  // Gastos Fijos
  const gastosFijos = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { 
      type: "EXPENSE", 
      date: dateFilter,
      category: { type: { in: ["FIXED"] } }
    }
  });

  // Gastos Variables
  const gastosVariables = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { 
      type: "EXPENSE", 
      date: dateFilter,
      category: { type: "VARIABLE" }
    }
  });

  // Pago de Deudas contabilizados 
  const gastosDeuda = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { 
      type: "EXPENSE", 
      date: dateFilter,
      installmentId: { not: null }
    }
  });

  const sumFijos = (gastosFijos._sum.amount || 0) + (gastosDeuda._sum.amount || 0);
  const sumVariables = gastosVariables._sum.amount || 0;
  const saldoLibre = totalIncome - sumFijos - sumVariables;

  // NUEVO: Saldo Total en Bancos
  const accounts = await db.account.findMany();
  const totalInBank = accounts.reduce((acc, curr) => {
    if (curr.currency === "USD") return acc + (curr.balance * 4000); // TRM base
    return acc + curr.balance;
  }, 0);

  const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Ingresos (+Base)</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{fmt.format(totalIncome)}</div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {rawBase < 100000 ? `Base multiplicada por TRM indicativa ($${currentTRM.toFixed(0)})` : "Basado en tus ajustes"}
          </p>
        </div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Gastos Fijos/Deuda</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{fmt.format(sumFijos)}</div>
          <p className="text-xs text-muted-foreground mt-1">Acumulado {period || "Mes"}</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Gastos Variables</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{fmt.format(sumVariables)}</div>
          <p className="text-xs text-muted-foreground mt-1">Acumulado {period || "Mes"}</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Saldo Libre</h3>
        </div>
        <div className="p-6 pt-0">
          <div className={`text-2xl font-bold ${saldoLibre >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            {fmt.format(saldoLibre)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Disponible para ahorro/extras</p>
        </div>
      </div>
      <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-sm">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-semibold">Efectivo Total</h3>
        </div>
        <div className="p-6 pt-0">
          <div className="text-2xl font-bold">{fmt.format(totalInBank)}</div>
          <p className="text-[10px] text-emerald-500/70 mt-1">Suma de todas las cuentas (NU, BBVA, etc.)</p>
        </div>
      </div>
    </div>
  );
}
