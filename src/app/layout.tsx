import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { QuickAddModal } from "@/components/transactions/quick-add-modal"
import { getCategories, getAccounts } from "@/actions/transactions";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinanzasTracker",
  description: "Control financiero quincenal y reducción de deudas.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getCategories();
  const accounts = await getAccounts();

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased bg-zinc-950 text-zinc-50 min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar accounts={accounts} />
              <main className="flex-1 overflow-x-hidden flex flex-col">
                <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <span className="font-semibold md:hidden">FinanzasTracker</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <QuickAddModal categories={categories} accounts={accounts} />
                  </div>
                </header>
                <div className="p-4 md:p-6 lg:p-8 flex-1">
                  {children}
                </div>
              </main>
            </SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
