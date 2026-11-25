/**
 * Leitura do banco para as telas. Converte Decimal → number para que os dados
 * possam ir para componentes cliente e para as funções de cálculo.
 */
import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { Conferencia, ItemPedidoCalc, OrcamentoCalc } from "./calculos";

type Dec = Prisma.Decimal | null | undefined;
export const num = (d: Dec): number => (d ? d.toNumber() : 0);
export const numOuNull = (d: Dec): number | null => (d === null || d === undefined ? null : d.toNumber());

const incluirOrcamento = {
  fornecedor: true,
  itens: true,
} satisfies Prisma.OrcamentoInclude;

type OrcamentoDb = Prisma.OrcamentoGetPayload<{ include: typeof incluirOrcamento }>;

export interface OrcamentoView extends OrcamentoCalc {
  fornecedorId: string;
  numero: string | null;
  data: Date;
  validade: Date | null;
  condicaoPagamento: string | null;
  prazoEntrega: string | null;
  emNomeDe: string | null;
  observacao: string | null;
  totalOriginal: number | null;
}

export function orcamentoParaView(o: OrcamentoDb): OrcamentoView {
  return {
    id: o.id,
    fornecedorId: o.fornecedorId,
    fornecedorNome: o.fornecedor.nome,
    frete: num(o.frete),
    desconto: num(o.desconto),
    numero: o.numero,
    data: o.data,
    validade: o.validade,
    condicaoPagamento: o.condicaoPagamento,
    prazoEntrega: o.prazoEntrega,
    emNomeDe: o.emNomeDe,
    observacao: o.observacao,
    totalOriginal: numOuNull(o.totalOriginal),
    itens: o.itens.map((i) => ({
      itemPedidoId: i.itemPedidoId,
      descricaoCotada: i.descricaoCotada,
      quantidade: num(i.quantidade),
      unidade: i.unidade,
      valorUnitario: num(i.valorUnitario),
      qtdEquivalente: numOuNull(i.qtdEquivalente),
      conferencia: i.conferencia as Conferencia,
      observacao: i.observacao,
    })),
  };
}

export function itemParaCalc(i: { id: string; ordem: number; descricao: string; quantidade: Prisma.Decimal; unidade: string }): ItemPedidoCalc {
  return { id: i.id, ordem: i.ordem, descricao: i.descricao, quantidade: num(i.quantidade), unidade: i.unidade };
}

/** Lista completa: itens + orçamentos (ordenados pela data de lançamento). */
export async function carregarLista(id: string) {
  const lista = await prisma.lista.findUnique({
    where: { id },
    include: {
      obra: true,
      itens: { orderBy: { ordem: "asc" } },
      orcamentos: { include: incluirOrcamento, orderBy: { criadoEm: "asc" } },
    },
  });
  if (!lista) return null;
  return {
    id: lista.id,
    nome: lista.nome,
    status: lista.status,
    observacao: lista.observacao,
    obraNome: lista.obra?.nome ?? null,
    criadoEm: lista.criadoEm,
    itens: lista.itens.map(itemParaCalc),
    orcamentos: lista.orcamentos.map(orcamentoParaView),
  };
}

export type ListaCompleta = NonNullable<Awaited<ReturnType<typeof carregarLista>>>;
