"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransaction } from "@/actions/transactions";
import { format } from "date-fns";

interface ReceiveInvoiceModalProps {
  recurringItemId: string;
  name: string;
  expectedAmount: number;
  currency: "COP" | "USD";
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  children?: React.ReactNode;
}

export function ReceiveInvoiceModal({ recurringItemId, name, expectedAmount, currency, type, categoryId, children }: ReceiveInvoiceModalProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(expectedAmount.toString());
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await createTransaction({
        amount: parseFloat(amount),
        currency: currency,
        type: type,
        date: new Date(dueDate), // Usar dueDate como fecha tentativa
        dueDate: new Date(dueDate),
        description: `Factura: ${name}`,
        categoryId: categoryId,
        recurringItemId: recurringItemId,
        status: "PENDING",
      });

      if (result.success) {
        setOpen(false);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al recibir la factura.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline" size="sm">Recibir Factura</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Causar / Recibir Factura: {name}</DialogTitle>
          <DialogDescription>
            Registra el monto exacto y la fecha de vencimiento. Esto aparecerá en tus Cuentas por Pagar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Valor Facturado ({currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Valor recurrente esperado: {expectedAmount}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Procesando..." : "Registrar Pendiente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
