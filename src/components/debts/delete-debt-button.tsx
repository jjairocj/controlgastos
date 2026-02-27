"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { deleteDebt } from "@/actions/debts";

interface DeleteDebtButtonProps {
    debtId: string;
    debtName: string;
}

export function DeleteDebtButton({ debtId, debtName }: DeleteDebtButtonProps) {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteDebt(debtId);
            if (result.success) {
                setOpen(false);
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error("Error", error);
            alert("Error al intentar eliminar.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar {debtName}</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>¿Estás completamente seguro?</DialogTitle>
                    <DialogDescription>
                        Esta acción no se puede deshacer. Se eliminará la deuda <strong>{debtName}</strong> y todas sus cuotas estimadas del sistema.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? "Eliminando..." : "Sí, eliminar deuda"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
