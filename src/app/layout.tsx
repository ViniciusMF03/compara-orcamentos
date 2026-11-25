import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compara Orçamentos",
  description: "Compare orçamentos de materiais de obra",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur print:hidden">
          <nav className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-3 sm:gap-4 sm:px-4">
            <Link href="/" className="mr-auto flex items-center gap-2 font-semibold">
              <span aria-hidden>🧱</span>
              <span className="hidden sm:inline">Compara Orçamentos</span>
              <span className="sm:hidden">Orçamentos</span>
            </Link>
            <Link href="/" className="rounded-md px-2 py-1 text-sm hover:bg-accent">
              Listas
            </Link>
            <Link href="/fornecedores" className="rounded-md px-2 py-1 text-sm hover:bg-accent">
              Fornecedores
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6 print:max-w-none print:p-0">{children}</main>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
