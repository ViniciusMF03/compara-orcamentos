import Link from "next/link";
import { prisma } from "@/lib/db";
import type { ListaCompleta } from "@/lib/dados";
import type { OrcamentoForm } from "@/lib/schemas";
import { OrcamentoFormulario } from "@/components/orcamento-form";

/** Parte comum de "novo orçamento" e "editar orçamento". */
export async function PaginaOrcamento({
  lista,
  orcamentoId,
  valores,
  titulo,
}: {
  lista: ListaCompleta;
  orcamentoId?: string;
  valores: OrcamentoForm;
  titulo: string;
}) {
  const fornecedores = await prisma.fornecedor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });
  return (
    <div className="space-y-4">
      <div>
        <Link href={`/listas/${lista.id}/orcamentos`} className="text-sm text-muted-foreground hover:underline">
          ← {lista.nome}
          {lista.obraNome && ` · ${lista.obraNome}`}
        </Link>
        <h1 className="text-xl font-semibold sm:text-2xl">{titulo}</h1>
      </div>
      <OrcamentoFormulario orcamentoId={orcamentoId} itensPedidos={lista.itens} fornecedores={fornecedores} valores={valores} />
    </div>
  );
}
