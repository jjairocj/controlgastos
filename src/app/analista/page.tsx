import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, ShieldCheck, Wallet, Flame, Target } from "lucide-react";
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

  let ccTotalDebt = 0;
  let loanTotalDebt = 0;
  let highestInterestDebt: any = null;
  let highestInterestRate = 0;

  // 2.1 Pasivos y Clasificación MACRO
  const debtsWithBalance = debts.map(debt => {
    const paid = debt.installments.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
    const total = debt.installments.reduce((sum, i) => sum + i.amount, 0);
    const remaining = total - paid;
    
    // Solo préstamos normales e independientes (Las TC se calculan por saldo de cuenta abajo)
    if (debt.type !== 'CREDIT_CARD') {
        loanTotalDebt += remaining;
    }

    if (remaining > 0 && debt.interestRate) {
        if (debt.interestRate > highestInterestRate) {
            highestInterestRate = debt.interestRate;
            highestInterestDebt = { ...debt, remaining };
        }
    }
    return { ...debt, remaining };
  });

  // Consumo Real de Tarjetas de Crédito desde los Saldos de las Cuentas 
  // (El balance representa el crédito usado, puede estar guardado en positivo o negativo según el flujo)
  accounts.forEach(acc => {
    if (acc.type === 'CREDIT_CARD') {
      ccTotalDebt += Math.abs(acc.balance || 0);
    }
  });

  const totalLiabilities = ccTotalDebt + loanTotalDebt;

  // 2.2 Compromisos Mensuales (EXCLUYENDO TC para el verdadero Burn Rate Operativo)
  const monthlyLoanDebtPayments = debts.reduce((acc, curr) => {
    if (curr.type === 'CREDIT_CARD') return acc; // No considerar como gasto mensual natural, es un blanco a aniquilar
    const nextInstallments = curr.installments.filter(i => !i.isPaid && isWithinInterval(i.dueDate, { start: startMonth, end: endMonth }));
    const sumNext = nextInstallments.reduce((sum, i) => sum + i.amount, 0);
    return acc + sumNext;
  }, 0);

  // 3. Obtener Transacciones (Cashflow libre excluyendo abonos pasados a TC)
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

  const pendingIncome = await db.transaction.findMany({
      where: { date: { gte: startMonth, lte: endMonth }, status: "PENDING", type: "INCOME" }
  }).then(txs => txs.reduce((acc, curr) => acc + curr.amount, 0));

  // 4. Analítica Macroeconómica
  const estimatedMonthlyIncome = totalIncome + pendingIncome;
  
  // Flujo Libre Limpio: Ingresos - (Gastos Fijos/Variables + Cuotas Préstamos Regulares)
  // Este es el "Arma" disponible para abatir la Tarjeta de Crédito.
  const estimatedMonthlyBurn = totalExpenses + monthlyLoanDebtPayments;
  const freeCashFlow = estimatedMonthlyIncome - estimatedMonthlyBurn;

  // Cupo Hobbies (5% de los ingresos, como presupuesto de salud mental)
  const hobbiesQuota = estimatedMonthlyIncome * 0.05;

  // 5. Diagnóstico Experto Macro
  let healthScore = 100;
  let riskLevel = "Moderado";
  const advices = [];

  // Regla 1: Foco en la asfixia por tarjetas (Deuda Tóxica)
  if (ccTotalDebt > 0) {
      healthScore -= 40; // Castigo inmenso por tarjeta viva
      riskLevel = "Alto";
      advices.push({
          type: "danger",
          title: "Prioridad Absoluta: Deuda de Tarjeta (Tóxica)",
          message: `Mantienes ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(ccTotalDebt)} vivos en Tarjetas de Crédito. Al poseer intereses de usura, son tu blanco ineludible. ` + 
            (freeCashFlow > 0 ? `Usa tu Flujo Libre de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(freeCashFlow)} este mes íntegramente para abatirlas.` : `¡CUIDADO! No tienes flujo libre para pagarlas tras cubrir tus préstamos fijos normales.`)
      });
  }

  // Regla 2: Estrategia Avalancha 
  if (highestInterestDebt && (highestInterestDebt as any).remaining > 0) {
      advices.push({
          type: "warning",
          title: "Estrategia de Intereses (Avalancha)",
          message: `Dejando de lado las tarjetas (si ya las liquidaste), matemáticamente tu deuda más costosa es "${highestInterestDebt.name}" a una destructiva tasa del ${highestInterestRate}%. Acelera abonos de capital allí después.`
      });
  }

  // Regla 3: Oxígeno de Reserva
  if (liquidAssets < estimatedMonthlyBurn && liquidAssets > 0) {
      healthScore -= 10;
      advices.push({
          type: "warning",
          title: "Falta Respaldo Anti-Hack (Fondo de Emergencia)",
          message: `Tus ahorros ($${liquidAssets.toLocaleString()}) no sobreviven ni 1 mes de gastos duros ($${estimatedMonthlyBurn.toLocaleString()}). En cuanto aniquiles las tarjetas, dirige tu flujo a engordar el cerdito de urgencias.`
      });
  } else if (liquidAssets <= 0 && ccTotalDebt > 0) {
       healthScore -= 30;
       riskLevel = "Crítico";
       advices.push({
          type: "danger",
          title: "Riesgo de Espiral de Deuda",
          message: `No tienes liquidez en efectivo, pero sí deudas costosas vivas. Estás financiando un estilo de vida que se retroalimenta del crédito. Corta el uso del plástico inmediatamente.`
      });
  } else if (ccTotalDebt === 0 && liquidAssets > estimatedMonthlyBurn) {
      healthScore = 100;
      riskLevel = "Excelente";
      advices.push({
          type: "success",
          title: "Finanzas Masterizadas",
          message: `Cero tarjetas rotando y ahorros líquidos por encima del peligro mensual. Eres libre para invertir donde decidas.`
      });
  }

  // Formateador
  const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  // Regla Especial: Presupuesto de Salud Mental
  if (estimatedMonthlyIncome > 0) {
      advices.push({
          type: "success",
          title: "Protección de Salud Mental 🧠",
          message: `Pagar deudas es duro, pero el burnout es peor. Tienes un "Cupo de Hobbies" recomendado del 5% de tus ingresos (${fmt.format(hobbiesQuota)}). Úsalo mensualmente ESTRICTAMENTE en cosas que te den felicidad genuina (salidas, TCG, videojuegos) sin remordimientos. Ignorar la diversión genera recaídas financieras.`
      });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Analista Financiero IA</h1>
        <p className="text-muted-foreground">Diagnóstico algorítmico de tu situación económica en tiempo real.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        
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
            <CardDescription className="font-semibold uppercase text-xs flex items-center gap-1">
               <Flame className="w-3 h-3 text-destructive"/> Deuda Tóxica (TC)
            </CardDescription>
            <CardTitle className={`text-2xl ${ccTotalDebt > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
              {fmt.format(ccTotalDebt)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-snug">
               Tus deudas en Tarjetas de Crédito frente a {fmt.format(loanTotalDebt)} en obligaciones estables.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold uppercase text-xs flex items-center gap-1">
               <Target className="w-3 h-3 text-primary"/> Flujo Libre (Armería)
            </CardDescription>
            <CardTitle className="text-2xl text-primary">
              {fmt.format(freeCashFlow)}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground leading-snug">
              Caché excedente tras cubrir gastos y préstamos. Ignorando tus tarjetas para atacarlas con esto.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5">
           <CardHeader className="pb-2">
            <CardDescription className="font-semibold uppercase text-xs text-primary">Estado de Armas Mínimo</CardDescription>
            <CardTitle className="text-lg text-foreground">
               {freeCashFlow <= 0 ? "Modo Sobrevivencia" : freeCashFlow > ccTotalDebt ? "Aniquilación Inmediata" : "Asedio Sistemático"}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs font-medium text-foreground/80 leading-snug">
               {freeCashFlow > 0 ? "Tienes liquidez para destinar contra las deudas críticas." : "No hay oxígeno. Estás usando deuda para subsistir deudas."} 
             </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-500/10 dark:border-indigo-400/30">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold uppercase text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
               Cupo Hobbies 🎮
            </CardDescription>
            <CardTitle className="text-2xl text-indigo-700 dark:text-indigo-300">
              {fmt.format(hobbiesQuota)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-snug">
               Espacio seguro para tu salud mental (5% de ingresos). ¡Libre de culpa!
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
