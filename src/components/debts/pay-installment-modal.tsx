"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransaction } from "@/actions/transactions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface PayInstallmentModalProps {
  installmentId: string;
  debtName: string;
  expectedAmount: number;
  currency: "COP" | "USD";
  dueDate: Date;
  accounts: { id: string; name: string; currency: string }[];
  categoryId: string;
  suggestedPaymentAmount?: number;
}

export function PayInstallmentModal({ 
  installmentId, 
  debtName, 
  expectedAmount, 
  currency, 
  dueDate, 
  accounts, 
  categoryId, 
  suggestedPaymentAmount
}: PayInstallmentModalProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(expectedAmount.toString());
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [accountId, setAccountId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      alert("Por favor selecciona una cuenta de origen.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTransaction({
        amount: parseFloat(amount),
        currency: currency,
        type: "EXPENSE",
        date: new Date(date),
        description: `Pago Cuota: ${debtName}`,
        categoryId: categoryId,
        accountId: accountId,
        installmentId: installmentId,
        status: "PAID",
      });

      if (result.success) {
        setOpen(false);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al procesar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full mt-2 bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-sm font-medium py-2 rounded-md ring-1 ring-inset ring-primary/20">
          Registrar Pago
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pagar {debtName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Valor a Pagar ({currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="flex flex-wrap gap-2 mt-2">
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 px-2 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                    onClick={() => setAmount(expectedAmount.toString())}
                >
                    Pago Mínimo: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(expectedAmount)}
                </Button>
                {suggestedPaymentAmount && suggestedPaymentAmount > expectedAmount && (
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="text-[10px] h-7 px-2 border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10"
                        onClick={() => setAmount(suggestedPaymentAmount.toString())}
                    >
                        Pago Inteligente (No Intereses): {new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(suggestedPaymentAmount)}
                    </Button>
                )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              El pago inteligente cubre las cuotas del mes de todas las deudas vinculadas a esta tarjeta.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Fecha de Pago</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account">Cuenta de Origen</Label>
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger id="account">
                <SelectValue placeholder="Selecciona desde dónde pagas" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Procesando..." : "Confirmar Pago"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
