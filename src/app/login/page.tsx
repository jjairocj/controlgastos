"use client";

import { useTransition, useState } from "react";
import { verifyPin } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await verifyPin(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm space-y-8 bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800 shadow-xl">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">FinanzasTracker</h1>
          <p className="text-sm text-zinc-400">Ingresa el PIN de seguridad para acceder a tu dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input 
              type="password" 
              name="pin" 
              inputMode="numeric" 
              pattern="[0-9]*"
              autoComplete="one-time-code"
              placeholder="••••" 
              className="text-center text-2xl tracking-widest h-14 bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500"
              required 
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center font-medium bg-red-500/10 py-2 rounded">
              {error}
            </p>
          )}

          <Button 
            type="submit" 
            className="w-full text-zinc-900 bg-emerald-500 hover:bg-emerald-600 h-12" 
            disabled={isPending}
          >
            {isPending ? "Verificando..." : "Desbloquear"}
          </Button>
        </form>
      </div>
    </div>
  );
}
