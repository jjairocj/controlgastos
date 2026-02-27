"use client";

import * as React from "react";
import { CopyPlus, ArrowRightLeft, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTransaction } from "@/actions/transactions";
import { createTransfer } from "@/actions/transfers";
import { Category, Account } from "@prisma/client";

interface QuickAddModalProps {
  categories: Category[];
  accounts: Account[];
}

export function QuickAddModal({ categories, accounts }: QuickAddModalProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("transaction");

  const handleTransactionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    const amount = Number(formData.get("amount"));
    const description = formData.get("description") as string;
    const type = formData.get("type") as "INCOME" | "EXPENSE";
    const currency = formData.get("currency") as "COP" | "USD";
    const categoryId = formData.get("categoryId") as string;
    const accountId = formData.get("accountId") as string;
    
    // Trazabilidad multi-moneda opcional
    const originalAmount = formData.get("originalAmount") ? Number(formData.get("originalAmount")) : undefined;
    const exchangeRate = formData.get("exchangeRate") ? Number(formData.get("exchangeRate")) : undefined;
    const originalCurrency = formData.get("originalCurrency") as "USD" | "COP" | undefined;

    startTransition(async () => {
      const res = await createTransaction({
        amount,
        description,
        type,
        currency,
        categoryId,
        accountId,
        isRecurring: false,
        date: new Date(),
        originalAmount,
        exchangeRate,
        originalCurrency
      });
      
      if (res.success) {
        setOpen(false);
      } else {
        setError(res.error || "Ocurrió un error.");
      }
    });
  };

  const handleTransferSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    const fromAccountId = formData.get("fromAccountId") as string;
    const toAccountId = formData.get("toAccountId") as string;
    const amountSource = Number(formData.get("amountSource"));
    const amountDest = Number(formData.get("amountDest"));
    const exchangeRate = Number(formData.get("exchangeRate"));
    const description = formData.get("description") as string;

    if (fromAccountId === toAccountId) {
        setError("La cuenta de origen y destino no pueden ser la misma.");
        return;
    }

    startTransition(async () => {
      const res = await createTransfer({
        fromAccountId,
        toAccountId,
        amountSource,
        amountDest,
        exchangeRate,
        description,
        date: new Date()
      });
      
      if (res.success) {
        setOpen(false);
      } else {
        setError(res.error || "Ocurrió un error.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2 shadow-lg shadow-primary/20 bg-emerald-600 hover:bg-emerald-500 text-white">
          <CopyPlus className="h-4 w-4" />
          <span>Registro Rápido</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] bg-zinc-950 border-zinc-900">
        <DialogHeader>
          <DialogTitle>Mover Dinero</DialogTitle>
          <DialogDescription>
            Registra un nuevo movimiento o transfiere entre tus cuentas.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
            <TabsTrigger value="transaction" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Transacción
            </TabsTrigger>
            <TabsTrigger value="transfer" className="gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transferencia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transaction">
            <form onSubmit={handleTransactionSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select name="type" defaultValue="EXPENSE">
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXPENSE">Gasto (-)</SelectItem>
                      <SelectItem value="INCOME">Ingreso (+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountId">Cuenta</Label>
                  <Select name="accountId" defaultValue={accounts[0]?.id}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto Principal (en Cuenta)</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" required placeholder="0.00" className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda Cuenta</Label>
                  <Select name="currency" defaultValue="COP">
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <details className="text-xs text-zinc-500 cursor-pointer">
                <summary className="hover:text-zinc-300 transition-colors py-1">Opciones Multi-moneda (TRM)</summary>
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                        <Label className="text-[10px]">Monto Original</Label>
                        <Input name="originalAmount" type="number" step="0.01" placeholder="Ej. 548.70" className="h-8 bg-zinc-900 border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px]">TRM Aplicada</Label>
                        <Input name="exchangeRate" type="number" step="0.01" placeholder="Ej. 4100" className="h-8 bg-zinc-900 border-zinc-800" />
                    </div>
                </div>
              </details>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoría</Label>
                <Select name="categoryId" defaultValue={categories[0]?.id}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input id="description" name="description" required placeholder="Ej. Pago Cuota Andrea (Parte 1)" className="bg-zinc-900 border-zinc-800" />
              </div>

              {error && <p className="text-xs text-red-500 font-medium bg-red-500/10 p-2 rounded">{error}</p>}
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isPending}>
                {isPending ? "Procesando..." : "Registrar Transacción"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="transfer">
            <form onSubmit={handleTransferSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>De (Origen)</Label>
                  <Select name="fromAccountId" defaultValue={accounts.find(a => a.currency === "USD")?.id || accounts[0]?.id}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>A (Destino)</Label>
                  <Select name="toAccountId" defaultValue={accounts.find(a => a.currency === "COP")?.id || accounts[1]?.id}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Origen</Label>
                  <Input name="amountSource" type="number" step="0.01" required placeholder="0.00" className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label>Monto Destino</Label>
                  <Input name="amountDest" type="number" step="0.01" required placeholder="0.00" className="bg-zinc-900 border-zinc-800" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>TRM Efectiva</Label>
                <Input name="exchangeRate" type="number" step="0.01" required placeholder="Ej. 4100" className="bg-zinc-900 border-zinc-800" />
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Input name="description" placeholder="Ej. Envío a Nu para gastos mes" className="bg-zinc-900 border-zinc-800" />
              </div>

              {error && <p className="text-xs text-red-500 font-medium bg-red-500/10 p-2 rounded">{error}</p>}
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isPending}>
                {isPending ? "Procesando transferencia..." : "Confirmar Transferencia"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
