"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fornecedorSchema, type FornecedorForm, type Resultado } from "@/lib/schemas";

export async function salvarFornecedor(dados: FornecedorForm): Promise<Resultado<{ id: string; nome: string }>> {
  const p = fornecedorSchema.safeParse(dados);
  if (!p.success) return { ok: false, erro: p.error.issues[0]?.message ?? "Dados inválidos" };
  const { id, ...resto } = p.data;
  const data = {
    nome: resto.nome,
    telefone: resto.telefone || null,
    whatsapp: resto.whatsapp || null,
    email: resto.email || null,
    cnpj: resto.cnpj || null,
    observacao: resto.observacao || null,
  };
  try {
    const f = id
      ? await prisma.fornecedor.update({ where: { id }, data })
      : await prisma.fornecedor.create({ data });
    revalidatePath("/", "layout");
    return { ok: true, dados: { id: f.id, nome: f.nome } };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, erro: `Já existe um fornecedor chamado "${data.nome}".` };
    return { ok: false, erro: "Não foi possível salvar o fornecedor." };
  }
}

export async function apagarFornecedor(id: string): Promise<Resultado> {
  const qtd = await prisma.orcamento.count({ where: { fornecedorId: id } });
  if (qtd > 0)
    return {
      ok: false,
      erro: `Este fornecedor tem ${qtd} orçamento(s) lançado(s). Apague os orçamentos antes de apagar o fornecedor.`,
    };
  try {
    await prisma.fornecedor.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não foi possível apagar o fornecedor." };
  }
}
