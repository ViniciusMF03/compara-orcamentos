"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseNumeroBR } from "@/lib/formato";
import {
  itensListaSchema,
  listaCabecalhoSchema,
  type ItensListaForm,
  type ListaCabecalhoForm,
  type Resultado,
} from "@/lib/schemas";

function primeiroErro(e: { issues: { message: string }[] }) {
  return e.issues[0]?.message ?? "Dados inválidos";
}

async function obraIdPorNome(nome: string): Promise<string | null> {
  if (!nome) return null;
  const obra = await prisma.obra.upsert({ where: { nome }, update: {}, create: { nome } });
  return obra.id;
}

export async function criarLista(dados: ListaCabecalhoForm): Promise<Resultado<{ id: string }>> {
  const p = listaCabecalhoSchema.safeParse(dados);
  if (!p.success) return { ok: false, erro: primeiroErro(p.error) };
  try {
    const lista = await prisma.lista.create({
      data: {
        nome: p.data.nome,
        status: p.data.status,
        observacao: p.data.observacao || null,
        obraId: await obraIdPorNome(p.data.obraNome),
      },
    });
    revalidatePath("/");
    return { ok: true, dados: { id: lista.id } };
  } catch {
    return { ok: false, erro: "Não foi possível criar a lista. Tente novamente." };
  }
}

export async function salvarCabecalhoLista(id: string, dados: ListaCabecalhoForm): Promise<Resultado> {
  const p = listaCabecalhoSchema.safeParse(dados);
  if (!p.success) return { ok: false, erro: primeiroErro(p.error) };
  try {
    await prisma.lista.update({
      where: { id },
      data: {
        nome: p.data.nome,
        status: p.data.status,
        observacao: p.data.observacao || null,
        obraId: await obraIdPorNome(p.data.obraNome),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não foi possível salvar a lista." };
  }
}

/** Salva a tabela de itens inteira: atualiza, cria e remove (na ordem enviada). */
export async function salvarItens(listaId: string, dados: ItensListaForm): Promise<Resultado> {
  const p = itensListaSchema.safeParse(dados);
  if (!p.success) return { ok: false, erro: primeiroErro(p.error) };
  try {
    await prisma.$transaction(async (tx) => {
      const existentes = await tx.itemPedido.findMany({ where: { listaId }, select: { id: true } });
      const manter = new Set(p.data.itens.map((i) => i.id).filter(Boolean));
      const remover = existentes.filter((e) => !manter.has(e.id)).map((e) => e.id);
      if (remover.length) await tx.itemPedido.deleteMany({ where: { id: { in: remover }, listaId } });
      for (const [idx, it] of p.data.itens.entries()) {
        const dadosItem = {
          ordem: idx + 1,
          descricao: it.descricao,
          quantidade: parseNumeroBR(it.quantidade)!,
          unidade: it.unidade,
        };
        if (it.id && existentes.some((e) => e.id === it.id)) {
          await tx.itemPedido.update({ where: { id: it.id }, data: dadosItem });
        } else {
          await tx.itemPedido.create({ data: { ...dadosItem, listaId } });
        }
      }
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não foi possível salvar os itens." };
  }
}

export async function apagarLista(id: string): Promise<Resultado> {
  try {
    await prisma.lista.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não foi possível apagar a lista." };
  }
}
