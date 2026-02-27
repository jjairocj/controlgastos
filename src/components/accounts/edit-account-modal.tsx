"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateAccount, deleteAccount } from "@/actions/accounts";
import { Settings2, CreditCard, Wallet } from "lucide-react";

interface EditAccountModalProps {
  account: {
    id: string;
    name: string;
    type: string;
    creditLimit?: number | null;
    currency: string;
    balance: number;
  };
  children?: React.ReactNode;
}

export function EditAccountModal({ account, children }: EditAccountModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account.name);
  const [type, setType] = useState(account.type);
  const [creditLimit, setCreditLimit] = useState(account.creditLimit?.toString() || "");
  const [balance, setBalance] = useState(account.balance.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await updateAccount({
        id: account.id,
        name,
        type: type as any,
        creditLimit: type === "CREDIT_CARD" ? parseFloat(creditLimit) : null,
        balance: parseFloat(balance),
      });

      if (result.success) {
        setOpen(false);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al actualizar la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta cuenta? Esta acción no se puede deshacer y no funcionará si la cuenta tiene movimientos o deudas asociadas.")) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await deleteAccount(account.id);
      if (result.success) {
        setOpen(false);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al eliminar la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
            <Settings2 className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configurar Cuenta: {account.name}
          </DialogTitle>
          <DialogDescription>
            Ajusta los parámetros técnicos de esta cuenta para el motor analítico.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          
          <div className="grid gap-2">
            <Label htmlFor="acc-name">Nombre de la Cuenta</Label>
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="acc-type">Tipo de Cuenta</Label>
                <Select value={type} onValueChange={setType}>
                <SelectTrigger id="acc-type">
                    <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="SAVINGS">Ahorros / Efectivo</SelectItem>
                    <SelectItem value="CREDIT_CARD">Tarjeta de Crédito</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="acc-balance">Saldo Actual ({account.currency})</Label>
                <Input id="acc-balance" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} required />
            </div>
          </div>

          {type === "CREDIT_CARD" && (
            <div className="grid gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-1">
                <Label htmlFor="acc-limit" className="text-primary font-bold">Límite de Crédito (Cupo Total)</Label>
                <Input 
                  id="acc-limit" 
                  type="number" 
                  step="0.01" 
                  value={creditLimit} 
                  onChange={(e) => setCreditLimit(e.target.value)} 
                  placeholder="Ej: 3900000"
                  required={type === "CREDIT_CARD"} 
                />
                <p className="text-[10px] text-muted-foreground italic">Este valor es crucial para calcular tu cupo disponible real.</p>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isSubmitting}>
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
