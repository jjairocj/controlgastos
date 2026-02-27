import TransactionTable from "@/components/transactions/transaction-table";
import { TimeFilter } from "@/components/transactions/time-filter";
import DashboardSummary from "@/components/dashboard/dashboard-summary";
import PendingWidget from "@/components/dashboard/pending-widget";
import { Suspense } from "react";

interface HomeProps {
  searchParams: { [key: string]: string | undefined };
}

export default function Home({ searchParams }: HomeProps) {
  const period = searchParams.period as "Q1" | "Q2" | undefined;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenido a FinanzasTracker. Revisa el estado de tu quincena y tus proyecciones.
        </p>
      </div>
      
      <Suspense fallback={<div className="h-32 rounded-xl border bg-muted/20 animate-pulse w-full"></div>}>
        <DashboardSummary period={period} />
      </Suspense>

      <Suspense fallback={<div className="h-32 rounded-xl border bg-muted/20 animate-pulse w-full"></div>}>
        <PendingWidget />
      </Suspense>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Transacciones Recientes</h2>
          <Suspense fallback={<div className="w-[180px] h-9 bg-muted animate-pulse rounded-md" />}>
            <TimeFilter />
          </Suspense>
        </div>
        <TransactionTable searchParams={{ period }} />
      </div>
    </div>
  );
}
