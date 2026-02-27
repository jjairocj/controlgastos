"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { createTransfer } from "@/actions/transfers";
import { updateAccount } from "@/actions/accounts";
import { CreditCard, ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface PayAccountModalProps {
  creditCardId: string;
  creditCardName: string;
  creditCardCurrency: string;
  currentBalance: number;
  accounts: any[];
}

export function PayAccountModal({ 
  creditCardId, 
  creditCardName, 
  creditCardCurrency,
  currentBalance,
  accounts 
}: PayAccountModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  
  // Suggested payment is the absolute value of the current negative balance
  const suggestedPayment = currentBalance < 0 ? Math.abs(currentBalance) : 0;
  
  const [amount, setAmount] = useState(suggestedPayment > 0 ? suggestedPayment.toString() : "");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
    setIsSubmitting(true);
    try {
        const paymentAmount = parseFloat(amount);
        
        if (sourceAccountId === "external" || !sourceAccountId) {
            // Pago desde una cuenta externa (no rastreada en FinanzasTracker)
            // Solo incrementamos el balance de la tarjeta de crédito simulando un ingreso/pago
            const res = await updateAccount({
                id: creditCardId,
                balance: currentBalance + paymentAmount // -5000 + 5000 = 0
            });
            
            if (!res.success) throw new Error(res.error);
        } else {
            // Pago desde una cuenta propia usando el motor de transferencias interno
            const sourceAcc = accounts.find(a => a.id === sourceAccountId);
            
            // Para simplificar MVP, si hay cruce de divisas pedimos TRM (asumimos 1 por ahora si es misma dif)
            const isCrossCurrency = sourceAcc && sourceAcc.currency !== creditCardCurrency;
            const trm = isCrossCurrency ? parseFloat(prompt(`Tasa de cambio (${sourceAcc.currency} -> ${creditCardCurrency}):`, "1") || "1") : 1;
            
            const sourceAmount = isCrossCurrency ? paymentAmount / trm : paymentAmount;

            const res = await createTransfer({
                fromAccountId: sourceAccountId,
                toAccountId: creditCardId,
                amountSource: sourceAmount,
                amountDest: paymentAmount,
                exchangeRate: trm,
                description: `Pago Tarjeta de Crédito ${creditCardName}`,
                date: new Date(date)
            });
            
            if (!res.success) throw new Error(res.error as string);
        }
        
        setOpen(false);
        setAmount("");
        setSourceAccountId("");
        router.refresh();
    } catch (error: any) {
        console.error(error);
        alert(error.message || "Error al procesar el pago de la tarjeta.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: creditCardCurrency, maximumFractionDigits: 0 });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="w-full gap-2 shadow-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Pagar Tarjeta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Abono a {creditCardName}
          </DialogTitle>
          <DialogDescription>
            Registra el pago de tu extracto o abona saldo para liberar cupo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-2 mb-4">
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Deuda Actual (Balance):</span>
                <span className="font-mono font-bold text-destructive">{fmt.format(currentBalance)}</span>
             </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paymentAmount" className="text-xs font-semibold uppercase text-muted-foreground">Valor a Pagar</Label>
            <Input 
                id="paymentAmount" 
                type="number" 
                step="0.01" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="0.00" 
                required 
                className="text-lg font-mono placeholder:text-muted-foreground/50"
            />
            {suggestedPayment > 0 && (
                 <p className="text-[10px] text-muted-foreground mt-1 flex justify-between">
                    <span>Sugerido (Pago Total):</span> 
                    <button type="button" onClick={() => setAmount(suggestedPayment.toString())} className="text-primary hover:underline font-medium">Usar {fmt.format(suggestedPayment)}</button>
                 </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sourceAccount" className="text-xs font-semibold uppercase text-muted-foreground">Cuenta Origen (Dinero sale de)</Label>
            <Select value={sourceAccountId} onValueChange={setSourceAccountId} required>
              <SelectTrigger id="sourceAccount">
                <SelectValue placeholder="Selecciona desde dónde pagaste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="external" className="font-medium text-emerald-600">Dinero Externo (No restar de mis cuentas)</SelectItem>
                {accounts.filter(a => a.id !== creditCardId && a.type !== "CREDIT_CARD").map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency}) - Saldo: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: acc.currency, maximumFractionDigits: 0 }).format(acc.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paymentDate" className="text-xs font-semibold uppercase text-muted-foreground">Fecha del Pago</Label>
            <Input id="paymentDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2 shadow-md">
              <ArrowRightLeft className="w-4 h-4" />
              {isSubmitting ? "Procesando..." : "Confirmar Pago"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
