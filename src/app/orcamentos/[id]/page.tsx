import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { carregarLista } from "@/lib/dados";
import { numeroParaCampo, paraInputData } from "@/lib/formato";
import { PaginaOrcamento } from "../pagina-orcamento";

export const dynamic = "force-dynamic";

export default async function EditarOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ref = await prisma.orcamento.findUnique({ where: { id }, select: { listaId: true } });
  if (!ref) notFound();
  const lista = await carregarLista(ref.listaId);
  const o = lista?.orcamentos.find((x) => x.id === id);
  if (!lista || !o) notFound();

  return (
    <PaginaOrcamento
      lista={lista}
      orcamentoId={o.id}
      titulo={`Orçamento ${o.fornecedorNome}`}
      valores={{
        listaId: lista.id,
        fornecedorId: o.fornecedorId,
        numero: o.numero ?? "",
        data: paraInputData(o.data),
        validade: paraInputData(o.validade),
        frete: o.frete ? numeroParaCampo(o.frete) : "",
        desconto: o.desconto ? numeroParaCampo(o.desconto) : "",
        condicaoPagamento: o.condicaoPagamento ?? "",
        prazoEntrega: o.prazoEntrega ?? "",
        emNomeDe: o.emNomeDe ?? "",
        observacao: o.observacao ?? "",
        totalOriginal: numeroParaCampo(o.totalOriginal),
        itens: lista.itens.map((p) => {
          const c = o.itens.find((i) => i.itemPedidoId === p.id);
          return c
            ? {
                itemPedidoId: p.id,
                cotado: true,
                descricaoCotada: c.descricaoCotada,
                quantidade: numeroParaCampo(c.quantidade),
                unidade: c.unidade,
                valorUnitario: numeroParaCampo(c.valorUnitario),
                qtdEquivalente: numeroParaCampo(c.qtdEquivalente),
                conferencia: c.conferencia,
                conferidoManual: true,
                observacao: c.observacao ?? "",
              }
            : {
                itemPedidoId: p.id,
                cotado: false,
                descricaoCotada: "",
                quantidade: numeroParaCampo(p.quantidade),
                unidade: p.unidade,
                valorUnitario: "",
                qtdEquivalente: "",
                conferencia: "CONFERE" as const,
                conferidoManual: false,
                observacao: "",
              };
        }),
      }}
    />
  );
}
