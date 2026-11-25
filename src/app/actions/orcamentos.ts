"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { deInputData, parseNumeroBR } from "@/lib/formato";
import { orcamentoSchema, type OrcamentoForm, type Resultado } from "@/lib/schemas";

export async function salvarOrcamento(dados: OrcamentoForm): Promise<Resultado<{ id: string }>> {
  const p = orcamentoSchema.safeParse(dados);
  if (!p.success) return { ok: false, erro: p.error.issues[0]?.message ?? "Dados inválidos" };
  const d = p.data;

  const itensPedidos = await prisma.itemPedido.findMany({ where: { listaId: d.listaId }, select: { id: true, descricao: true } });
  const validos = new Map(itensPedidos.map((i) => [i.id, i.descricao]));

  const cabecalho = {
    listaId: d.listaId,
    fornecedorId: d.fornecedorId,
    numero: d.numero || null,
    data: deInputData(d.data)!,
    validade: deInputData(d.validade),
    frete: parseNumeroBR(d.frete) ?? 0,
    desconto: parseNumeroBR(d.desconto) ?? 0,
    condicaoPagamento: d.condicaoPagamento || null,
    prazoEntrega: d.prazoEntrega || null,
    emNomeDe: d.emNomeDe || null,
    observacao: d.observacao || null,
    totalOriginal: parseNumeroBR(d.totalOriginal),
  };
  const itens = d.itens
    .filter((i) => i.cotado && validos.has(i.itemPedidoId))
    .map((i) => ({
      itemPedidoId: i.itemPedidoId,
      descricaoCotada: i.descricaoCotada || validos.get(i.itemPedidoId)!,
      quantidade: parseNumeroBR(i.quantidade)!,
      unidade: i.unidade,
      valorUnitario: parseNumeroBR(i.valorUnitario)!,
      qtdEquivalente: parseNumeroBR(i.qtdEquivalente),
      conferencia: i.conferencia,
      observacao: i.observacao || null,
    }));

  try {
    const id = await prisma.$transaction(async (tx) => {
      if (d.id) {
        await tx.orcamento.update({ where: { id: d.id }, data: cabecalho });
        await tx.itemCotado.deleteMany({ where: { orcamentoId: d.id } });
        await tx.itemCotado.createMany({ data: itens.map((i) => ({ ...i, orcamentoId: d.id! })) });
        return d.id;
      }
      const novo = await tx.orcamento.create({ data: { ...cabecalho, itens: { create: itens } } });
      return novo.id;
    });
    revalidatePath("/", "layout");
    return { ok: true, dados: { id } };
  } catch {
    return { ok: false, erro: "Não foi possível salvar o orçamento. Confira os dados e tente novamente." };
  }
}

export async function apagarOrcamento(id: string): Promise<Resultado> {
  try {
    await prisma.orcamento.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não foi possível apagar o orçamento." };
  }
}
