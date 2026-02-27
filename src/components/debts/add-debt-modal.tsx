"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInMonths, addMonths, startOfMonth } from "date-fns";
import { createDebt } from "@/actions/debts";
import { PlusCircle, Calendar, CreditCard, Landmark, Info } from "lucide-react";

export function AddDebtModal({ accounts = [] }: { accounts: any[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("CREDIT_CARD");
  const [accountId, setAccountId] = useState<string>("");
  const [currency, setCurrency] = useState<string>("COP");
  const [totalInstallments, setTotalInstallments] = useState("1");
  const [averageInstallmentAmount, setAverageInstallmentAmount] = useState("");
  
  // Próximo día de pago (lo que antes era startDate)
  const [nextPaymentDate, setNextPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Fecha Final (Nueva funcionalidad)
  const [endDate, setEndDate] = useState("");
  const [useEndDate, setUseEndDate] = useState(false);

  // Campos Históricos (Solo para Préstamos)
  const [disbursementAmount, setDisbursementAmount] = useState("");
  const [paidInstallments, setPaidInstallments] = useState("0");
  const [disbursementDate, setDisbursementDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calcular cuotas si se usa la Fecha Final
  useEffect(() => {
    if (useEndDate && endDate && nextPaymentDate) {
      const start = new Date(nextPaymentDate);
      const end = new Date(endDate);
      const months = differenceInMonths(end, start) + 1;
      if (months > 0) {
        setTotalInstallments(months.toString());
      }
    }
  }, [useEndDate, endDate, nextPaymentDate]);

  // Calcular monto total proyectado
  const calculatedTotalAmount = parseInt(totalInstallments || "0") * parseFloat(averageInstallmentAmount || "0");
  const interestAmount = disbursementAmount ? calculatedTotalAmount - parseFloat(disbursementAmount) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await createDebt({
        name,
        type: type as any,
        currency: currency as any,
        totalAmount: calculatedTotalAmount,
        totalInstallments: parseInt(totalInstallments),
        averageInstallmentAmount: parseFloat(averageInstallmentAmount),
        startDate: new Date(nextPaymentDate),
        accountId: type === "CREDIT_CARD" && accountId ? accountId : undefined,
        disbursementAmount: type !== "CREDIT_CARD" && disbursementAmount ? parseFloat(disbursementAmount) : undefined,
        disbursementDate: type !== "CREDIT_CARD" && disbursementDate ? new Date(disbursementDate) : undefined,
        paidInstallments: type !== "CREDIT_CARD" && paidInstallments ? parseInt(paidInstallments) : 0,
      });

      if (result.success) {
        setOpen(false);
        // Reset form
        setName("");
        setTotalInstallments("1");
        setAverageInstallmentAmount("");
        setUseEndDate(false);
        setEndDate("");
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al procesar la deuda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoan = type !== "CREDIT_CARD";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-sm">
            <PlusCircle className="w-4 h-4" />
            Nueva Operación
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoan ? <Landmark className="w-5 h-5 text-primary" /> : <CreditCard className="w-5 h-5 text-primary" />}
            Registrar {isLoan ? "Obligación / Préstamo" : "Tarjeta / Cupo"}
          </DialogTitle>
          <DialogDescription>
            {isLoan 
              ? "Para préstamos bancarios con cuotas fijas y capital desembolsado." 
              : "Para compras a cuotas con tarjeta de crédito (cupo rotativo)."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre / Concepto</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={isLoan ? "Ej: Crédito Vehículo" : "Ej: Compra Computador"} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</Label>
                <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                    <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="CREDIT_CARD">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="PERSONAL_LOAN">Préstamo Personal</SelectItem>
                    <SelectItem value="MORTGAGE">Hipotecario / Vivienda</SelectItem>
                    <SelectItem value="OTHER">Otro Financiamiento</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="currency" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Moneda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                    <SelectValue placeholder="Moneda" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="COP">COP (Pesos)</SelectItem>
                    <SelectItem value="USD">USD (Dólares)</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>
          
          {type === "CREDIT_CARD" && (
            <div className="grid gap-2 animate-in fade-in">
                <Label htmlFor="account" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tarjeta de Crédito Origen</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger id="account">
                        <SelectValue placeholder="Selecciona una tarjeta (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Ninguna / Otra</SelectItem>
                        {accounts.filter((a: any) => a.type === "CREDIT_CARD").map((acc: any) => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">Vincular a una tarjeta para rastrear cupo y pago del mes.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="avgAmount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor Cuota</Label>
                </div>
                <Input id="avgAmount" type="number" step="0.01" value={averageInstallmentAmount} onChange={(e) => setAverageInstallmentAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="nextDate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Próximo Día de Pago</Label>
                <Input id="nextDate" type="date" value={nextPaymentDate} onChange={(e) => setNextPaymentDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-dashed">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-primary">DURACIÓN DEL CRÉDITO</Label>
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px] uppercase font-bold text-muted-foreground"
                    onClick={() => setUseEndDate(!useEndDate)}
                >
                    {useEndDate ? "Usar # de cuotas" : "Usar Fecha Final"}
                </Button>
            </div>

            {useEndDate ? (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-1">
                    <Label htmlFor="endDate" className="text-[11px] text-muted-foreground">¿Cuándo terminas de pagar?</Label>
                    <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                    <p className="text-[10px] italic text-primary">Calculado: {totalInstallments} cuotas restantes</p>
                </div>
            ) : (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-1">
                    <Label htmlFor="installments" className="text-[11px] text-muted-foreground">¿A cuántas cuotas (totales)?</Label>
                    <Input id="installments" type="number" min="1" step="1" value={totalInstallments} onChange={(e) => setTotalInstallments(e.target.value)} required />
                </div>
            )}
          </div>

          {isLoan && (
            <div className="space-y-4 border-t pt-4 animate-in fade-in">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Landmark className="w-3 h-3" /> Datos de Desembolso (Historial)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                      <Label htmlFor="disbAmount" className="text-xs">Monto Original</Label>
                      <Input id="disbAmount" type="number" step="0.01" value={disbursementAmount} onChange={(e) => setDisbursementAmount(e.target.value)} placeholder="Capital recibido" />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="paidInst" className="text-xs">Cuotas Pagadas</Label>
                      <Input id="paidInst" type="number" min="0" step="1" value={paidInstallments} onChange={(e) => setPaidInstallments(e.target.value)} placeholder="Ej: 5" />
                  </div>
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="disbDate" className="text-xs">Fecha Original Desembolso</Label>
                  <Input id="disbDate" type="date" value={disbursementDate} onChange={(e) => setDisbursementDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-2">
              <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground italic">Total Proyectado (Capital + Int):</span>
                  <span className="font-mono font-bold text-primary">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(calculatedTotalAmount)}
                  </span>
              </div>
              {isLoan && disbursementAmount && parseFloat(disbursementAmount) > 0 && (
                <div className="flex justify-between items-center text-xs text-warning-foreground border-t border-primary/10 pt-2">
                    <span className="italic">Costo del Crédito (Solo Intereses):</span>
                    <span className="font-mono font-bold">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(interestAmount)}
                    </span>
                </div>
              )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="px-8 shadow-lg shadow-primary/20" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Registrar Deuda"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
