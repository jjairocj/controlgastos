"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInMonths } from "date-fns";
import { editDebt } from "@/actions/debts";
import { Pencil, Landmark, CreditCard, Save, Hash, Wallet } from "lucide-react";

interface EditDebtModalProps {
  debtId: string;
  initialName: string;
  initialTotalAmount: number;
  initialDisbursementAmount?: number | null;
  initialDisbursementDate?: Date | null;
  initialTEA?: number | null;
  initialTotalInstallments: number;
  initialAverageInstallmentAmount: number;
  initialPaidInstallments: number;
  initialNextPaymentDate?: Date | null;
  initialAccountId?: string | null;
  accounts?: any[];
  currency: string;
  type: string;
}

export function EditDebtModal({ 
  debtId, 
  initialName, 
  initialTotalAmount, 
  initialDisbursementAmount, 
  initialDisbursementDate, 
  initialTEA, 
  initialTotalInstallments,
  initialAverageInstallmentAmount,
  initialPaidInstallments,
  initialNextPaymentDate,
  initialAccountId,
  accounts = [],
  currency,
  type
}: EditDebtModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [debtType, setDebtType] = useState(type);
  const [debtCurrency, setDebtCurrency] = useState(currency);
  const [accountId, setAccountId] = useState(initialAccountId || "");
  
  // Manejo de Plazos (Sincronizado con AddDebtModal)
  const [totalInstallments, setTotalInstallments] = useState(initialTotalInstallments.toString());
  const [avgAmount, setAvgAmount] = useState(initialAverageInstallmentAmount.toString());
  const [nextPaymentDate, setNextPaymentDate] = useState(initialNextPaymentDate ? format(new Date(initialNextPaymentDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
  
  // Fecha Final logic
  const [endDate, setEndDate] = useState("");
  const [useEndDate, setUseEndDate] = useState(false);

  // Historial
  const [disbursementAmount, setDisbursementAmount] = useState(initialDisbursementAmount ? initialDisbursementAmount.toString() : "");
  const [disbursementDate, setDisbursementDate] = useState(initialDisbursementDate ? format(new Date(initialDisbursementDate), "yyyy-MM-dd") : "");
  const [paidInstallments, setPaidInstallments] = useState(initialPaidInstallments.toString());
  const [effectiveAnnualRate, setEffectiveAnnualRate] = useState(initialTEA ? (initialTEA * 100).toString() : "");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calcular cuotas si se usa la Fecha Final (Paridad con AddModal)
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

  const calculatedTotalAmount = parseInt(totalInstallments || "0") * parseFloat(avgAmount || "0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await editDebt({
        id: debtId,
        name,
        type: debtType as any,
        currency: debtCurrency as any,
        totalAmount: calculatedTotalAmount,
        totalInstallments: parseInt(totalInstallments),
        averageInstallmentAmount: parseFloat(avgAmount),
        paidInstallments: parseInt(paidInstallments),
        nextPaymentDate: new Date(nextPaymentDate),
        accountId: debtType === "CREDIT_CARD" && accountId && accountId !== "none" ? accountId : undefined,
        disbursementAmount: disbursementAmount ? parseFloat(disbursementAmount) : undefined,
        disbursementDate: disbursementDate ? new Date(disbursementDate) : undefined,
        effectiveAnnualRate: effectiveAnnualRate ? (parseFloat(effectiveAnnualRate) / 100) : undefined,
      });

      if (result.success) {
        setOpen(false);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al editar la deuda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoan = debtType !== "CREDIT_CARD";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Editar {initialName}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Pencil className="w-4 h-4" /> Gestión Integral de Deuda
          </DialogTitle>
          <DialogDescription>
            Ajusta cualquier valor. El sistema reconstruirá el calendario de pagos basándose en tu nueva configuración.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          
          <div className="grid gap-2">
            <Label htmlFor="edit-name" className="text-xs font-bold uppercase text-muted-foreground">Nombre / Concepto</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="edit-type" className="text-xs font-bold uppercase text-muted-foreground">Tipo</Label>
                <Select value={debtType} onValueChange={setDebtType}>
                    <SelectTrigger id="edit-type">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CREDIT_CARD">Compra con Tarjeta (Cuotas)</SelectItem>
                        <SelectItem value="PERSONAL_LOAN">Préstamo Personal</SelectItem>
                        <SelectItem value="MORTGAGE">Hipotecario</SelectItem>
                        <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="edit-currency" className="text-xs font-bold uppercase text-muted-foreground">Moneda</Label>
                <Select value={debtCurrency} onValueChange={setDebtCurrency}>
                    <SelectTrigger id="edit-currency">
                        <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="COP">COP</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          {debtType === "CREDIT_CARD" && (
            <div className="grid gap-2 animate-in fade-in">
                <Label htmlFor="edit-account" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tarjeta de Crédito Origen</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger id="edit-account">
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
                <Label htmlFor="edit-avgAmount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor Cuota</Label>
                <Input id="edit-avgAmount" type="number" step="0.01" value={avgAmount} onChange={(e) => setAvgAmount(e.target.value)} required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="edit-nextDate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Próximo Día de Pago</Label>
                <Input id="edit-nextDate" type="date" value={nextPaymentDate} onChange={(e) => setNextPaymentDate(e.target.value)} required />
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
                    <Label htmlFor="edit-endDate" className="text-[11px] text-muted-foreground">¿Cuándo terminas de pagar?</Label>
                    <Input id="edit-endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                    <p className="text-[10px] italic text-primary">Calculado: {totalInstallments} cuotas restantes</p>
                </div>
            ) : (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-1">
                    <Label htmlFor="edit-installments" className="text-[11px] text-muted-foreground">¿A cuántas cuotas (totales)?</Label>
                    <Input id="edit-installments" type="number" min="1" step="1" value={totalInstallments} onChange={(e) => setTotalInstallments(e.target.value)} required />
                </div>
            )}
          </div>

          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-1">
              <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground italic">Nuevo Total Proyectado:</span>
                  <span className="font-mono font-bold text-primary">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: debtCurrency, maximumFractionDigits: 0 }).format(calculatedTotalAmount)}
                  </span>
              </div>
          </div>

          {isLoan && (
            <div className="space-y-4 border-t border-dashed pt-5 mt-2 animate-in fade-in">
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Landmark className="w-3 h-3" /> Datos de Desembolso (Historial)
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                      <Label htmlFor="edit-disbAmount" className="text-xs">Monto Original</Label>
                      <Input id="edit-disbAmount" type="number" step="0.01" value={disbursementAmount} onChange={(e) => setDisbursementAmount(e.target.value)} placeholder="Capital recibido" />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="edit-paidInst" className="text-xs text-primary font-bold">Cuotas Pagadas</Label>
                      <Input id="edit-paidInst" type="number" min="0" step="1" value={paidInstallments} onChange={(e) => setPaidInstallments(e.target.value)} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-disbDate" className="text-[11px] font-medium">Fecha de Desembolso</Label>
                        <Input id="edit-disbDate" type="date" value={disbursementDate} onChange={(e) => setDisbursementDate(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-tea" className="text-[11px] font-medium text-orange-600">TEA Manual (%)</Label>
                        <Input id="edit-tea" type="number" step="0.01" value={effectiveAnnualRate} onChange={(e) => setEffectiveAnnualRate(e.target.value)} placeholder="Ej: 28.5" />
                    </div>
                </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2 shadow-md">
              <Save className="w-4 h-4" />
              {isSubmitting ? "Guardando..." : "Actualizar Deuda"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

