import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { carregarLista } from "@/lib/dados";
import { numeroParaCampo } from "@/lib/formato";
import type { StatusLista } from "@/lib/schemas";
import { Card } from "@/components/ui/card";
import { ListaAbas } from "@/components/lista-abas";
import { ListaCabecalhoFormulario } from "@/components/lista-cabecalho-form";
import { ItensEditor } from "@/components/itens-editor";

export const dynamic = "force-dynamic";

export default async function EditarLista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lista, obras] = await Promise.all([
    carregarLista(id),
    prisma.obra.findMany({ orderBy: { nome: "asc" }, select: { nome: true } }),
  ]);
  if (!lista) notFound();

  const cotacoesPorItem: Record<string, number> = {};
  for (const o of lista.orcamentos) for (const i of o.itens) cotacoesPorItem[i.itemPedidoId] = (cotacoesPorItem[i.itemPedidoId] ?? 0) + 1;
  const nOrc = lista.orcamentos.length;

  return (
    <div>
      <ListaAbas listaId={lista.id} nome={lista.nome} obra={lista.obraNome} ativa="itens" />
      <div className="space-y-6">
        <Card className="p-4">
          <ListaCabecalhoFormulario
            listaId={lista.id}
            obras={obras.map((o) => o.nome)}
            valores={{
              nome: lista.nome,
              obraNome: lista.obraNome ?? "",
              status: lista.status as StatusLista,
              observacao: lista.observacao ?? "",
            }}
            resumoApagar={`${lista.itens.length} ${lista.itens.length === 1 ? "item" : "itens"} e ${nOrc} ${nOrc === 1 ? "orçamento" : "orçamentos"}`}
          />
        </Card>
        <ItensEditor
          // remonta o editor quando os itens mudam no servidor
          key={lista.itens.map((i) => `${i.id}:${i.quantidade}:${i.descricao}:${i.unidade}`).join("|")}
          listaId={lista.id}
          cotacoesPorItem={cotacoesPorItem}
          itens={lista.itens.map((i) => ({
            id: i.id,
            descricao: i.descricao,
            quantidade: numeroParaCampo(i.quantidade),
            unidade: i.unidade,
          }))}
        />
      </div>
    </div>
  );
}
