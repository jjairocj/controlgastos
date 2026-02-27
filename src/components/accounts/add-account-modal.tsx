"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAccount } from "@/actions/accounts";
import { PlusCircle, Landmark } from "lucide-react";

export function AddAccountModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("SAVINGS");
  const [currency, setCurrency] = useState("COP");
  const [creditLimit, setCreditLimit] = useState("");
  const [balance, setBalance] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await createAccount({
        name,
        type: type as any,
        currency: currency as any,
        creditLimit: type === "CREDIT_CARD" && creditLimit ? parseFloat(creditLimit) : null,
        balance: parseFloat(balance) || 0,
      });

      if (result.success) {
        setOpen(false);
        // Reset form
        setName("");
        setType("SAVINGS");
        setCurrency("COP");
        setCreditLimit("");
        setBalance("0");
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
          <PlusCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Nueva Cuenta o Tarjeta
          </DialogTitle>
          <DialogDescription>
            Agrega una nueva cuenta bancaria, efectivo o tarjeta de crédito.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          
          <div className="grid gap-2">
            <Label htmlFor="new-acc-name">Nombre de la Cuenta</Label>
            <Input id="new-acc-name" placeholder="Ej: NU Bank, Nómina, Billetera..." value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="new-acc-type">Tipo</Label>
                <Select value={type} onValueChange={setType}>
                <SelectTrigger id="new-acc-type">
                    <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="SAVINGS">Ahorros / Efectivo</SelectItem>
                    <SelectItem value="CREDIT_CARD">Tarjeta de Crédito</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="new-acc-currency">Moneda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="new-acc-currency">
                    <SelectValue placeholder="Divisa" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="COP">COP ($)</SelectItem>
                    <SelectItem value="USD">USD (US$)</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>

          <div className="grid gap-2">
              <Label htmlFor="new-acc-balance">Opcional: Saldo Inicial ({currency})</Label>
              <Input id="new-acc-balance" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} required />
              <p className="text-[10px] text-muted-foreground italic">El saldo base con el que empiezas.</p>
          </div>

          {type === "CREDIT_CARD" && (
            <div className="grid gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in zoom-in-95">
                <Label htmlFor="new-acc-limit" className="text-primary font-bold text-xs">Límite de Crédito (Obligatorio para TC)</Label>
                <Input 
                  id="new-acc-limit" 
                  type="number" 
                  step="0.01" 
                  value={creditLimit} 
                  onChange={(e) => setCreditLimit(e.target.value)} 
                  placeholder={"Ej: " + (currency === "COP" ? "5000000" : "1500")}
                  required={type === "CREDIT_CARD"} 
                />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Cuenta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
