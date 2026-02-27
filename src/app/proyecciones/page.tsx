import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjections } from "@/lib/projections";

// Simulador de Proyecciones de Flujo de Caja (Cash flow)
export default async function ProyeccionesPage() {
  
  const periods = await getProjections();

  const formatCOP = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proyecciones Quincenales</h1>
        <p className="text-muted-foreground mt-2">
          Estimación de efectivo necesario para cubrir los próximos periodos. Ideal para saber exactamente qué hacer con el remanente.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {periods.map((p, i) => {
          const saldoLibre = p.income - (p.expenses + p.debt);
          return (
            <Card key={i} className="border-t-4 border-t-primary/80 overflow-hidden">
              <CardHeader className="bg-muted/10 pb-4">
                <CardTitle className="text-xl">{p.name}</CardTitle>
                <CardDescription>Escenario Estimado de liquidez</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ingresos Esperados
                  </span>
                  <span className="font-mono font-medium text-emerald-500">{formatCOP(p.income)}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div> Pagos Fijos (Servicios, etc)
                  </span>
                  <span className="font-mono font-medium">{formatCOP(p.expenses)}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive"></div> Cuotas de Deudas
                  </span>
                  <span className="font-mono font-medium">{formatCOP(p.debt)}</span>
                </div>
                
                <div className="h-px bg-border my-2 w-full"></div>
                
                <div className="flex justify-between items-center">
                  <span className="font-bold">Saldo Libre Calculado</span>
                  <span className={`text-xl font-mono font-bold ${saldoLibre < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {formatCOP(saldoLibre)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-sm flex gap-4 items-start">
          <div className="text-3xl">🧮</div>
          <div>
            <h4 className="font-bold text-base mb-1">Manejo de Divisas (COP/USD)</h4>
            <p className="text-muted-foreground">
              Hemos preparado el sistema para indexar pagos en USD. En un futuro, el remanente tomará el histórico del Exchange Rate y te indicará cuánto COP exacto reservar para el pago final de la tarjeta internacional a la Tasa de Cambio del Día (TRM).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
