import TransactionTable from "@/components/transactions/transaction-table";
import { TimeFilter } from "@/components/transactions/time-filter";
import { Suspense } from "react";

interface TransaccionesPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function TransaccionesPage({ searchParams }: TransaccionesPageProps) {
  const { period } = await searchParams;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial de Transacciones</h1>
        <p className="text-muted-foreground mt-2">
          Consulta y filtra todos los movimientos de tus cuentas.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Suspense fallback={<div className="w-[180px] h-9 bg-muted animate-pulse rounded-md" />}>
          <TimeFilter />
        </Suspense>
      </div>

      <div className="bg-card rounded-xl border shadow-sm">
        <TransactionTable searchParams={{ period: period as any }} />
      </div>
    </div>
  );
}
