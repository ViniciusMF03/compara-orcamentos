/**
 * Schemas Zod compartilhados entre os formulários (React Hook Form) e as Server Actions.
 * Números chegam como texto em pt-BR ("45,32") e são convertidos com parseNumeroBR.
 */
import { z } from "zod";
import { parseNumeroBR } from "./formato";

export const STATUS_LISTA = ["ABERTA", "COMPRADA", "CANCELADA"] as const;
export type StatusLista = (typeof STATUS_LISTA)[number];
export const ROTULO_STATUS: Record<StatusLista, string> = {
  ABERTA: "Aberta",
  COMPRADA: "Comprada",
  CANCELADA: "Cancelada",
};

const texto = z.string().trim();
const textoOpcional = z.string().trim().max(500, "Texto muito longo");

const numeroOpcional = z
  .string()
  .trim()
  .refine((s) => s === "" || parseNumeroBR(s) !== null, "Número inválido");

const numeroPositivo = z
  .string()
  .trim()
  .min(1, "Informe a quantidade")
  .refine((s) => (parseNumeroBR(s) ?? 0) > 0, "Precisa ser maior que zero");

const dataObrigatoria = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const dataOpcional = z.string().refine((s) => s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s), "Data inválida");

// ---- Lista ----------------------------------------------------------------

export const listaCabecalhoSchema = z.object({
  nome: texto.min(1, "Dê um nome para a lista").max(120, "Nome muito longo"),
  obraNome: textoOpcional,
  status: z.enum(STATUS_LISTA),
  observacao: textoOpcional,
});
export type ListaCabecalhoForm = z.infer<typeof listaCabecalhoSchema>;

export const itemPedidoSchema = z.object({
  id: z.string().optional(),
  descricao: texto.min(1, "Descreva o item").max(200, "Descrição muito longa"),
  quantidade: numeroPositivo,
  unidade: texto.min(1, "Unidade").max(10, "Unidade muito longa"),
});
export const itensListaSchema = z.object({ itens: z.array(itemPedidoSchema) });
export type ItensListaForm = z.infer<typeof itensListaSchema>;

// ---- Fornecedor -----------------------------------------------------------

export const fornecedorSchema = z.object({
  id: z.string().optional(),
  nome: texto.min(1, "Informe o nome do fornecedor").max(120, "Nome muito longo"),
  telefone: textoOpcional,
  whatsapp: textoOpcional,
  email: z
    .string()
    .trim()
    .refine((s) => s === "" || z.string().email().safeParse(s).success, "E-mail inválido"),
  cnpj: textoOpcional,
  observacao: textoOpcional,
});
export type FornecedorForm = z.infer<typeof fornecedorSchema>;

// ---- Orçamento ------------------------------------------------------------

export const CONFERENCIA_VALORES = ["CONFERE", "CONFIRMAR", "DIVERGENTE"] as const;

export const itemCotadoSchema = z
  .object({
    itemPedidoId: z.string(),
    cotado: z.boolean(),
    descricaoCotada: textoOpcional,
    quantidade: z.string().trim(),
    unidade: z.string().trim(),
    valorUnitario: z.string().trim(),
    qtdEquivalente: numeroOpcional,
    conferencia: z.enum(CONFERENCIA_VALORES),
    conferidoManual: z.boolean(),
    observacao: textoOpcional,
  })
  .superRefine((v, ctx) => {
    if (!v.cotado) return;
    if (!((parseNumeroBR(v.quantidade) ?? 0) > 0))
      ctx.addIssue({ code: "custom", path: ["quantidade"], message: "Quantidade inválida" });
    const vu = parseNumeroBR(v.valorUnitario);
    if (vu === null || vu < 0) ctx.addIssue({ code: "custom", path: ["valorUnitario"], message: "Valor inválido" });
    if (!v.unidade) ctx.addIssue({ code: "custom", path: ["unidade"], message: "Unidade" });
  });

export const orcamentoSchema = z.object({
  id: z.string().optional(),
  listaId: z.string().min(1),
  fornecedorId: z.string().min(1, "Escolha o fornecedor"),
  numero: textoOpcional,
  data: dataObrigatoria,
  validade: dataOpcional,
  frete: numeroOpcional,
  desconto: numeroOpcional,
  condicaoPagamento: textoOpcional,
  prazoEntrega: textoOpcional,
  emNomeDe: textoOpcional,
  observacao: textoOpcional,
  totalOriginal: numeroOpcional,
  itens: z.array(itemCotadoSchema),
});
export type OrcamentoForm = z.infer<typeof orcamentoSchema>;
export type ItemCotadoForm = z.infer<typeof itemCotadoSchema>;

export type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string };
