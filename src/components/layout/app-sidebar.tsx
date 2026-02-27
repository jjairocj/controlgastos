"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Home, LayoutList, LineChart, Wallet } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import type { Account } from "@prisma/client";
import { AddAccountModal } from "@/components/accounts/add-account-modal";
import { EditAccountModal } from "@/components/accounts/edit-account-modal";

const items = [
  {
    title: "Inicio",
    url: "/",
    icon: Home,
  },
  {
    title: "Transacciones",
    url: "/transacciones",
    icon: LayoutList,
  },
  {
    title: "Deudas",
    url: "/deudas",
    icon: CreditCard,
  },
  {
    title: "Proyecciones",
    url: "/proyecciones",
    icon: LineChart,
  },
  {
    title: "Checklist Pagos",
    url: "/checklist",
    icon: Wallet,
  }
]

interface AppSidebarProps {
  accounts?: any[];
}

export function AppSidebar({ accounts = [] }: AppSidebarProps) {
  const pathname = usePathname();

  const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  
  return (
    <Sidebar variant="inset" className="border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs tracking-widest text-muted-foreground uppercase mt-4 mb-2 px-4">
            Finanzas Tracker
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {items.map((item) => {
                const isActive = pathname === item.url || (pathname.startsWith(item.url) && item.url !== "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`rounded-lg transition-all ${
                        isActive 
                          ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium" 
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-3 py-2.5">
                        <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-[10px] tracking-widest text-muted-foreground uppercase px-4 mb-2 flex justify-between items-center w-full">
            <span>Mis Cuentas</span>
            <AddAccountModal />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-4 space-y-3">
              {accounts.map(acc => (
                <EditAccountModal key={acc.id} account={acc}>
                  <div className="flex flex-col gap-0.5 group cursor-pointer hover:bg-muted/50 p-1.5 -mx-1.5 rounded-md transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                        {acc.name}
                      </span>
                      <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-500">
                        {acc.currency}
                      </span>
                    </div>
                    <span className={`text-sm font-bold tracking-tight ${acc.balance < 0 ? 'text-red-400' : 'text-zinc-100'}`}>
                      {acc.currency === 'COP' ? fmtCOP.format(acc.balance) : fmtUSD.format(acc.balance)}
                    </span>
                  </div>
                </EditAccountModal>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
