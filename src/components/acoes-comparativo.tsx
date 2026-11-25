"use client";

import { toast } from "sonner";
import { FileSpreadsheet, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AcoesComparativo({ listaId, resumo }: { listaId: string; resumo: string }) {
  async function copiar() {
    try {
      await navigator.clipboard.writeText(resumo);
      toast.success("Resumo copiado. É só colar no WhatsApp.");
    } catch {
      // navegadores sem permissão de área de transferência: abre o WhatsApp com o texto
      window.open(`https://wa.me/?text=${encodeURIComponent(resumo)}`, "_blank", "noopener");
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button asChild variant="outline" size="sm">
        <a href={`/listas/${listaId}/comparativo/excel`} download>
          <FileSpreadsheet /> Exportar Excel
        </a>
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer /> Imprimir / PDF
      </Button>
      <Button variant="outline" size="sm" onClick={copiar}>
        <MessageCircle /> Copiar resumo para WhatsApp
      </Button>
    </div>
  );
}
