import { db } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TransactionTableProps {
  searchParams?: { 
    categoryId?: string; 
    period?: "Q1" | "Q2";
  };
}

export default async function TransactionTable({ searchParams }: TransactionTableProps) {
  // Configurar las fechas base buscando el mes actual o todos los datos
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let dateFilter = {};
  if (searchParams?.period === "Q1") {
    dateFilter = {
      gte: new Date(year, month, 1),
      lt: new Date(year, month, 16),
    };
  } else if (searchParams?.period === "Q2") {
    dateFilter = {
      gte: new Date(year, month, 16),
      lt: new Date(year, month + 1, 1),
    };
  }

  const transactions = await db.transaction.findMany({
    where: {
      ...(searchParams?.categoryId ? { categoryId: searchParams.categoryId } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    },
    orderBy: { date: "desc" },
    include: { category: true },
    take: 50,
  });

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-card shadow">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-muted/50 border-b text-muted-foreground">
          <tr>
            <th className="px-6 py-4 font-semibold tracking-wider">Fecha</th>
            <th className="px-6 py-4 font-semibold tracking-wider">Descripción</th>
            <th className="px-6 py-4 font-semibold tracking-wider">Categoría</th>
            <th className="px-6 py-4 font-semibold tracking-wider text-right">Monto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
              <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                {format(tx.date, "dd MMM yyyy", { locale: es })}
              </td>
              <td className="px-6 py-4">
                <div className="font-medium">{tx.description}</div>
                {tx.isRecurring && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary mt-1.5 border border-primary/20">
                    RECURRENTE
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground ring-1 ring-inset ring-border">
                  {tx.category?.name || "Sin Categoría"}
                </span>
              </td>
              <td className={`px-6 py-4 text-right font-mono font-medium tracking-tight ${
                tx.type === 'INCOME' ? 'text-emerald-500' : ''
              }`}>
                {tx.type === 'INCOME' ? '+' : '-'}
                {new Intl.NumberFormat(tx.currency === 'COP' ? 'es-CO' : 'en-US', {
                  style: 'currency',
                  currency: tx.currency,
                  maximumFractionDigits: tx.currency === 'COP' ? 0 : 2
                }).format(tx.amount)}
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium">
                No hay transacciones recientes registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
