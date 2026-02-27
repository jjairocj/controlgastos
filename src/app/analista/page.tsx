import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, ShieldCheck, Wallet } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export default async function AnalistaPage() {
  const now = new Date();
  const startMonth = startOfMonth(now);
  const endMonth = endOfMonth(now);

  // 1. Obtener todas las Cuentas
  const accounts = await db.account.findMany();
  
  // 1.1 Activos Líquidos (Cuentas tipo Ahorro, en COP por simplicidad del MVP)
  const liquidAssets = accounts
    .filter(a => a.type === "SAVINGS" && a.balance > 0)
    .reduce((acc, curr) => acc + curr.balance, 0);

  // 2. Obtener todas las Deudas (Préstamos + TC)
  const debts = await db.debt.findMany({
    include: {
      installments: true
    }
  });

  // 2.1 Pasivos (Suma del capital restante calculado)
  const totalLiabilities = debts.reduce((acc, curr) => {
    const paid = curr.installments.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
    const total = curr.installments.reduce((sum, i) => sum + i.amount, 0);
    return acc + (total - paid);
  }, 0);

  // 2.2 Compromisos de deudas ESTE MES
  const monthlyDebtPayments = debts.reduce((acc, curr) => {
    const nextInstallments = curr.installments.filter(i => !i.isPaid && isWithinInterval(i.dueDate, { start: startMonth, end: endMonth }));
    const sumNext = nextInstallments.reduce((sum, i) => sum + i.amount, 0);
    return acc + sumNext; // Asume que solo hay 1 cuota por mes por deuda
  }, 0);

  // 3. Obtener Transacciones (Para estimar Cashflow libre y Gastos de este mes)
  const thisMonthTransactions = await db.transaction.findMany({
    where: {
      date: { gte: startMonth, lte: endMonth },
      status: "PAID"
    },
    include: { category: true }
  });

  const totalIncome = thisMonthTransactions
    .filter(t => t.type === "INCOME")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = thisMonthTransactions
    .filter(t => t.type === "EXPENSE")
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Considerar ingresos recurrentes PENDING para el mes si no han llegado
  const pendingIncome = await db.transaction.findMany({
      where: {
          date: { gte: startMonth, lte: endMonth },
          status: "PENDING",
          type: "INCOME"
      }
  }).then(txs => txs.reduce((acc, curr) => acc + curr.amount, 0));

  // 4. Cálculos y Ratios Algorítmicos
  const estimatedMonthlyIncome = totalIncome + pendingIncome;
  
  // Ratio de Endeudamiento Mensual (Debt-to-Income): ¿Qué % del sueldo se va en cuotas?
  const dtiRatio = estimatedMonthlyIncome > 0 ? (monthlyDebtPayments / estimatedMonthlyIncome) * 100 : 0;
  
  // Nivel de Liquidez Rápida: ¿Los ahorros alcanzan para cubrir los gastos fijos + deudas del mes?
  // Aproximamos gastos mensuales totales (incluyendo cuotas) como:
  const estimatedMonthlyBurn = totalExpenses + monthlyDebtPayments; // Simplificado
  const liquidityMonths = estimatedMonthlyBurn > 0 ? (liquidAssets / estimatedMonthlyBurn) : 0;
  
  // Patrimonio Neto
  const netWorth = liquidAssets - totalLiabilities;

  // 5. Diagnóstico Experto (Reglas Financieras Basadas en IA/Algoritmo)
  let healthScore = 100;
  let riskLevel = "Bajo";
  const advices = [];

  // Reglas DTI (Debt To Income)
  if (dtiRatio > 40) {
      healthScore -= 30;
      riskLevel = "Crítico";
      advices.push({
          type: "danger",
          title: "Sobreendeudamiento Detectado",
          message: `Estás comprometiendo el ${dtiRatio.toFixed(1)}% de tus ingresos mensuales solo en pagos de cuotas. Necesitas aplicar el método Bola de Nieve urgentemente para liberar flujo de caja o consolidar deudas.`
      });
  } else if (dtiRatio > 25) {
      healthScore -= 15;
      riskLevel = "Moderado";
      advices.push({
          type: "warning",
          title: "Carga de Deuda Moderada",
          message: `Tus cuotas consumen el ${dtiRatio.toFixed(1)}% de tu ingreso. Intenta no adquirir nuevas obligaciones y enfócate en pre-pagar la deuda más pequeña.`
      });
  } else if (dtiRatio > 0) {
      advices.push({
          type: "success",
          title: "Buen Control de Deuda",
          message: `El ${dtiRatio.toFixed(1)}% de tus ingresos se va en deudas. Es un nivel muy sano según estándares financieros (< 30%).`
      });
  }

  // Reglas Liquidez (Fondo de Emergencia)
  if (liquidityMonths < 1 && liquidAssets > 0) {
      healthScore -= 20;
      if (riskLevel !== "Crítico") riskLevel = "Alto";
      advices.push({
          type: "warning",
          title: "Fondo de Emergencia Insuficiente",
          message: `Tus ahorros líquidos (${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(liquidAssets)}) no alcanzan para cubrir 1 mes de gastos sin ingresos (Burn rate est. de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(estimatedMonthlyBurn)}/mes). Prioriza crear un cojín de ahorros.`
      });
  } else if (liquidityMonths === 0) {
       healthScore -= 40;
       riskLevel = "Crítico";
       advices.push({
          type: "danger",
          title: "Peligro de Iliquidez",
          message: `Tus cuentas rastreadas muestran un saldo consolidado de 0 o negativo. Estás operando con flujo de caja diario. Reducir gastos hormiga es vital en este ciclo.`
      });
  } else if (liquidityMonths >= 3) {
      healthScore += 10;
      advices.push({
          type: "success",
          title: "Excelente Respaldo Financiero",
          message: `Tienes liquidez equivalente a ${liquidityMonths.toFixed(1)} meses de supervivencia. Tu fondo de emergencia está sólido.`
      });
  }

  // Formateador
  const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Analista Financiero IA</h1>
        <p className="text-muted-foreground">Diagnóstico algorítmico de tu situación económica en tiempo real.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        <Card className={`border-${healthScore >= 80 ? 'emerald' : healthScore >= 50 ? 'warning' : 'destructive'}/50 bg-background/50`}>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold uppercase text-xs">Puntaje de Salud</CardDescription>
            <CardTitle className="text-3xl flex items-baseline gap-1">
              {Math.max(0, healthScore)} <span className="text-sm text-muted-foreground font-normal">/ 100</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
             <Progress value={Math.max(0, healthScore)} className="h-2 mt-2" />
             <p className="text-xs text-muted-foreground mt-2">Riesgo: <strong className={healthScore >= 80 ? 'text-emerald-500' : healthScore >= 50 ? 'text-warning' : 'text-destructive'}>{riskLevel}</strong></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold uppercase text-xs">Patrimonio Neto Est.</CardDescription>
            <CardTitle className={`text-2xl ${netWorth < 0 ? 'text-destructive' : 'text-emerald-500'}`}>
              {fmt.format(netWorth)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-snug">
              Tus activos ({fmt.format(liquidAssets)}) menos tus pasivos y obligaciones calculadas ({fmt.format(totalLiabilities)}).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold uppercase text-xs flex items-center gap-1">
               <Wallet className="w-3 h-3"/> Flujo Libre Restante (Mes)
            </CardDescription>
            <CardTitle className="text-2xl text-primary">
              {fmt.format(estimatedMonthlyIncome - estimatedMonthlyBurn)}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground leading-snug">
              Ingresos y saldo vivo frente a obligaciones estimadas de esta mensualidad.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5">
           <CardHeader className="pb-2">
            <CardDescription className="font-semibold uppercase text-xs text-primary">Diagnóstico Directo</CardDescription>
            <CardTitle className="text-lg text-foreground">
               {netWorth < 0 ? "Patrimonio en Deuda" : "Acumulación Neta"}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs font-medium text-foreground/80 leading-snug">
               {liquidityMonths >= 1 ? "Tienes oxígeno financiero." : "Flujo al límite."} 
               {dtiRatio > 40 && " Las deudas están frenando severamente tus finanzas."}
             </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Recomendaciones del Analista</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {advices.map((advice, i) => (
          <Card key={i} className={`border-l-4 ${
             advice.type === 'danger' ? 'border-l-destructive bg-destructive/5' : 
             advice.type === 'warning' ? 'border-l-warning bg-warning/5' : 
             'border-l-emerald-500 bg-emerald-500/5'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {advice.type === 'danger' && <AlertTriangle className="w-5 h-5 text-destructive" />}
                {advice.type === 'warning' && <Lightbulb className="w-5 h-5 text-warning" />}
                {advice.type === 'success' && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
                <CardTitle className="text-lg">{advice.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium leading-relaxed opacity-90">{advice.message}</p>
            </CardContent>
          </Card>
        ))}

        {advices.length === 0 && (
           <Card className="border-l-4 border-l-primary bg-primary/5">
             <CardHeader className="pb-2">
               <CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" /> Sin Novedades Críticas</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-sm font-medium opacity-90">Por el momento, tus métricas reportadas al sistema no detonan alarmas matemáticas. Mantén tus registros al día para recibir un análisis preciso.</p>
             </CardContent>
           </Card>
        )}
      </div>

    </div>
  );
}
