import { notFound, redirect } from "next/navigation";
import { carregarLista } from "@/lib/dados";
import { hojeInputData, numeroParaCampo } from "@/lib/formato";
import { PaginaOrcamento } from "../pagina-orcamento";

export const dynamic = "force-dynamic";

export default async function NovoOrcamento({ searchParams }: { searchParams: Promise<{ lista?: string }> }) {
  const { lista: listaId } = await searchParams;
  if (!listaId) redirect("/");
  const lista = await carregarLista(listaId);
  if (!lista) notFound();

  return (
    <PaginaOrcamento
      lista={lista}
      titulo="Novo orçamento"
      valores={{
        listaId: lista.id,
        fornecedorId: "",
        numero: "",
        data: hojeInputData(),
        validade: "",
        frete: "",
        desconto: "",
        condicaoPagamento: "",
        prazoEntrega: "",
        emNomeDe: lista.obraNome ?? "",
        observacao: "",
        totalOriginal: "",
        itens: lista.itens.map((p) => ({
          itemPedidoId: p.id,
          cotado: true,
          descricaoCotada: "",
          quantidade: numeroParaCampo(p.quantidade),
          unidade: p.unidade,
          valorUnitario: "",
          qtdEquivalente: "",
          conferencia: "CONFERE",
          conferidoManual: false,
          observacao: "",
        })),
      }}
    />
  );
}
