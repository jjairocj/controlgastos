"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TimeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const currentPeriod = searchParams.get("period") || "ALL";

  const handleValueChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "ALL") {
      params.delete("period");
    } else {
      params.set("period", val);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={currentPeriod} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[180px] h-9">
        <SelectValue placeholder="Filtro de Tiempo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Todo el Mes</SelectItem>
        <SelectItem value="Q1">Quincena 1 (Días 1-15)</SelectItem>
        <SelectItem value="Q2">Quincena 2 (Días 16-31)</SelectItem>
      </SelectContent>
    </Select>
  );
}
