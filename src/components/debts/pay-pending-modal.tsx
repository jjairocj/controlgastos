"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { payPendingTransaction } from "@/actions/transactions";
import { format } from "date-fns";

interface PayPendingModalProps {
  transactionId: string;
  name: string;
  expectedAmount: number;
  currency: "COP" | "USD";
  dueDate: Date;
  accounts: { id: string; name: string; currency: string }[];
  children?: React.ReactNode;
}

export function PayPendingModal({ transactionId, name, expectedAmount, currency, dueDate, accounts, children }: PayPendingModalProps) {
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
      const result = await payPendingTransaction({
        transactionId,
        amount: parseFloat(amount),
        date: new Date(date),
        accountId: accountId,
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
        {children || <Button variant="outline" size="sm">Pagar</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pagar Factura: {name}</DialogTitle>
          <DialogDescription>
            Confirma el pago de esta obligación y selecciona la cuenta de donde saldrá el dinero.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Valor Pagado ({currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Valor sugerido según factura: {expectedAmount}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Fecha Real de Pago</Label>
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
