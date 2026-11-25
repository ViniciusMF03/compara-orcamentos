/**
 * Regras de cálculo do comparativo. Funções puras (sem banco, sem React),
 * testadas em calculos.test.ts. Valores monetários são arredondados a centavos.
 */

export type Conferencia = "CONFERE" | "CONFIRMAR" | "DIVERGENTE";
export const CONFERENCIAS: Conferencia[] = ["CONFERE", "CONFIRMAR", "DIVERGENTE"];

export interface ItemPedidoCalc {
  id: string;
  ordem: number;
  descricao: string;
  quantidade: number;
  unidade: string;
}

export interface ItemCotadoCalc {
  itemPedidoId: string;
  descricaoCotada: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  conferencia: Conferencia;
  /** Quanto o item cotado rende na unidade pedida (ex.: 1 sc = 40 kg → 40). */
  qtdEquivalente?: number | null;
  observacao?: string | null;
}

export interface OrcamentoCalc {
  id: string;
  fornecedorNome: string;
  frete: number;
  desconto: number;
  itens: ItemCotadoCalc[];
}

/** Arredonda para centavos evitando erros de ponto flutuante (ex.: 100 × 0,24). */
export function arred(v: number): number {
  // toFixed(6) absorve o resíduo binário (1,175 × 100 = 117,49999999999999) antes de arredondar
  return Math.round(Number((v * 100).toFixed(6))) / 100 || 0;
}

export function totalItem(ic: Pick<ItemCotadoCalc, "quantidade" | "valorUnitario">): number {
  return arred(ic.quantidade * ic.valorUnitario);
}

export function totalItens(orc: Pick<OrcamentoCalc, "itens">): number {
  return arred(orc.itens.reduce((s, ic) => s + totalItem(ic), 0));
}

export function totalGeral(orc: Pick<OrcamentoCalc, "itens" | "frete" | "desconto">): number {
  return arred(totalItens(orc) - orc.desconto + orc.frete);
}

export function itensFaltando(orc: Pick<OrcamentoCalc, "itens">, itens: ItemPedidoCalc[]): ItemPedidoCalc[] {
  const cotados = new Set(orc.itens.map((i) => i.itemPedidoId));
  return itens.filter((i) => !cotados.has(i.id));
}

export function cobreTudo(orc: Pick<OrcamentoCalc, "itens">, itens: ItemPedidoCalc[]): boolean {
  return itens.length > 0 && itensFaltando(orc, itens).length === 0;
}

// ---------------------------------------------------------------------------
// Preço por unidade pedida e conferência automática
// ---------------------------------------------------------------------------

const SINONIMOS_UNIDADE: Record<string, string> = { pc: "pç", "pç.": "pç", m2: "m²", und: "un", lt: "l" };

export function normalizarUnidade(u: string): string {
  const s = u.trim().toLowerCase();
  return SINONIMOS_UNIDADE[s] ?? s;
}

/** true quando o fornecedor cotou quantidade ou unidade diferente da pedida. */
export function quantidadeDiferente(
  pedido: Pick<ItemPedidoCalc, "quantidade" | "unidade">,
  cotado: Pick<ItemCotadoCalc, "quantidade" | "unidade">,
): boolean {
  return (
    normalizarUnidade(pedido.unidade) !== normalizarUnidade(cotado.unidade) ||
    Math.abs(pedido.quantidade - cotado.quantidade) > 1e-9
  );
}

/**
 * Preço por unidade pedida (ex.: R$/kg). Usa qtdEquivalente quando informada;
 * se a unidade cotada for a mesma da pedida, usa a própria quantidade cotada.
 * Retorna null quando não dá para comparar (unidades diferentes sem equivalência).
 */
export function precoPorUnidadePedida(
  pedido: Pick<ItemPedidoCalc, "unidade">,
  cotado: Pick<ItemCotadoCalc, "quantidade" | "unidade" | "valorUnitario" | "qtdEquivalente">,
): number | null {
  const total = totalItem(cotado);
  let qtdNaUnidadePedida: number | null = null;
  if (cotado.qtdEquivalente && cotado.qtdEquivalente > 0) qtdNaUnidadePedida = cotado.qtdEquivalente;
  else if (normalizarUnidade(pedido.unidade) === normalizarUnidade(cotado.unidade)) qtdNaUnidadePedida = cotado.quantidade;
  if (!qtdNaUnidadePedida) return null;
  // 4 casas: preço por unidade costuma ter centavos fracionados (R$ 0,1192/un)
  return Math.round(Number(((total / qtdNaUnidadePedida) * 10000).toFixed(4))) / 10000;
}

/**
 * Conferência sugerida: se a quantidade/unidade cotada difere da pedida e o item
 * ainda não foi conferido manualmente, marca CONFIRMAR. Caso contrário mantém a atual.
 */
export function conferenciaSugerida(
  pedido: Pick<ItemPedidoCalc, "quantidade" | "unidade">,
  cotado: Pick<ItemCotadoCalc, "quantidade" | "unidade">,
  atual: Conferencia,
  conferidoManualmente: boolean,
): Conferencia {
  if (conferidoManualmente) return atual;
  if (atual === "CONFERE" && quantidadeDiferente(pedido, cotado)) return "CONFIRMAR";
  return atual;
}

// ---------------------------------------------------------------------------
// Comparativo por item
// ---------------------------------------------------------------------------

export interface CelulaComparativo {
  orcamentoId: string;
  cotado: ItemCotadoCalc | null;
  total: number | null;
  divergente: boolean;
  maisBarato: boolean;
  precoUnidadePedida: number | null;
}

export interface LinhaComparativo {
  item: ItemPedidoCalc;
  celulas: CelulaComparativo[];
  menor: number | null;
  /** segundo menor − menor (null se menos de dois orçamentos cotaram) */
  diferenca: number | null;
}

export function comparativoPorItem(itens: ItemPedidoCalc[], orcs: OrcamentoCalc[]): LinhaComparativo[] {
  return ordenarItens(itens).map((item) => {
    const celulas: CelulaComparativo[] = orcs.map((o) => {
      const cotado = o.itens.find((i) => i.itemPedidoId === item.id) ?? null;
      return {
        orcamentoId: o.id,
        cotado,
        total: cotado ? totalItem(cotado) : null,
        divergente: cotado?.conferencia === "DIVERGENTE",
        maisBarato: false,
        precoUnidadePedida: cotado ? precoPorUnidadePedida(item, cotado) : null,
      };
    });
    const valores = celulas.map((c) => c.total).filter((v): v is number => v !== null).sort((a, b) => a - b);
    const menor = valores.length ? valores[0] : null;
    const diferenca = valores.length >= 2 ? arred(valores[1] - valores[0]) : null;
    if (menor !== null) for (const c of celulas) c.maisBarato = c.total === menor;
    return { item, celulas, menor, diferenca };
  });
}

function ordenarItens(itens: ItemPedidoCalc[]) {
  return [...itens].sort((a, b) => a.ordem - b.ordem);
}

// ---------------------------------------------------------------------------
// Melhor orçamento único e melhor combinação (com fretes)
// ---------------------------------------------------------------------------

export function melhorOrcamentoUnico(
  itens: ItemPedidoCalc[],
  orcs: OrcamentoCalc[],
): { orcamento: OrcamentoCalc; total: number } | null {
  let melhor: { orcamento: OrcamentoCalc; total: number } | null = null;
  for (const o of orcs) {
    if (!cobreTudo(o, itens)) continue;
    const total = totalGeral(o);
    if (!melhor || total < melhor.total) melhor = { orcamento: o, total };
  }
  return melhor;
}

export interface CompraNoFornecedor {
  orcamentoId: string;
  fornecedorNome: string;
  itens: { item: ItemPedidoCalc; cotado: ItemCotadoCalc; total: number }[];
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
}

export interface Combinacao {
  orcamentoIds: string[];
  custo: number;
  compras: CompraNoFornecedor[];
}

/**
 * Avalia uma combinação de orçamentos: cada item vai para o mais barato dentro dela;
 * soma fretes e descontos só dos orçamentos efetivamente usados.
 * Retorna null se a combinação não cobre todos os itens.
 */
export function avaliarCombinacao(itens: ItemPedidoCalc[], orcs: OrcamentoCalc[]): Combinacao | null {
  if (itens.length === 0 || orcs.length === 0) return null;
  const porOrc = new Map<string, CompraNoFornecedor>();
  for (const item of ordenarItens(itens)) {
    let escolha: { orc: OrcamentoCalc; cotado: ItemCotadoCalc; total: number } | null = null;
    for (const o of orcs) {
      const cotado = o.itens.find((i) => i.itemPedidoId === item.id);
      if (!cotado) continue;
      const total = totalItem(cotado);
      if (!escolha || total < escolha.total) escolha = { orc: o, cotado, total };
    }
    if (!escolha) return null;
    let compra = porOrc.get(escolha.orc.id);
    if (!compra) {
      compra = {
        orcamentoId: escolha.orc.id,
        fornecedorNome: escolha.orc.fornecedorNome,
        itens: [],
        subtotal: 0,
        frete: escolha.orc.frete,
        desconto: escolha.orc.desconto,
        total: 0,
      };
      porOrc.set(escolha.orc.id, compra);
    }
    compra.itens.push({ item, cotado: escolha.cotado, total: escolha.total });
  }
  const compras = orcs.map((o) => porOrc.get(o.id)).filter((c): c is CompraNoFornecedor => !!c);
  for (const c of compras) {
    c.subtotal = arred(c.itens.reduce((s, i) => s + i.total, 0));
    c.total = arred(c.subtotal - c.desconto + c.frete);
  }
  return {
    orcamentoIds: compras.map((c) => c.orcamentoId),
    custo: arred(compras.reduce((s, c) => s + c.total, 0)),
    compras,
  };
}

/** Acima deste número de orçamentos usa heurística gulosa em vez de testar 2ⁿ combinações. */
export const LIMITE_FORCA_BRUTA = 12;

function melhorEntre(a: Combinacao | null, b: Combinacao | null): Combinacao | null {
  if (!a) return b;
  if (!b) return a;
  if (b.custo < a.custo - 1e-9) return b;
  // empate: prefere menos fornecedores
  if (Math.abs(b.custo - a.custo) < 1e-9 && b.compras.length < a.compras.length) return b;
  return a;
}

export function melhorCombinacao(
  itens: ItemPedidoCalc[],
  orcs: OrcamentoCalc[],
): (Combinacao & { heuristica: boolean }) | null {
  const candidatos = orcs.filter((o) => o.itens.length > 0);
  if (itens.length === 0 || candidatos.length === 0) return null;

  if (candidatos.length <= LIMITE_FORCA_BRUTA) {
    let melhor: Combinacao | null = null;
    const n = candidatos.length;
    for (let mask = 1; mask < 1 << n; mask++) {
      const subconjunto = candidatos.filter((_, i) => mask & (1 << i));
      melhor = melhorEntre(melhor, avaliarCombinacao(itens, subconjunto));
    }
    return melhor ? { ...melhor, heuristica: false } : null;
  }

  // Heurística gulosa: a cada passo adiciona o orçamento que mais melhora
  // (primeiro cobrir mais itens, depois menor custo). Para quando nada melhora.
  let escolhidos: OrcamentoCalc[] = [];
  let atual: Combinacao | null = null;
  const cobertos = (sel: OrcamentoCalc[]) =>
    itens.filter((it) => sel.some((o) => o.itens.some((i) => i.itemPedidoId === it.id))).length;
  for (;;) {
    let melhorPasso: { sel: OrcamentoCalc[]; comb: Combinacao | null; cob: number } | null = null;
    for (const o of candidatos) {
      if (escolhidos.includes(o)) continue;
      const sel = [...escolhidos, o];
      const comb = avaliarCombinacao(itens, sel);
      const cob = cobertos(sel);
      if (
        !melhorPasso ||
        cob > melhorPasso.cob ||
        (cob === melhorPasso.cob && comb && (!melhorPasso.comb || comb.custo < melhorPasso.comb.custo))
      ) {
        melhorPasso = { sel, comb, cob };
      }
    }
    if (!melhorPasso) break;
    const melhora = atual === null ? true : melhorPasso.comb !== null && melhorPasso.comb.custo < atual.custo - 1e-9;
    if (!melhora) break;
    escolhidos = melhorPasso.sel;
    if (melhorPasso.comb) atual = melhorPasso.comb;
  }
  // compara também com o melhor orçamento único
  for (const o of candidatos) atual = melhorEntre(atual, avaliarCombinacao(itens, [o]));
  return atual ? { ...atual, heuristica: true } : null;
}

// ---------------------------------------------------------------------------
// Análise completa de uma lista
// ---------------------------------------------------------------------------

export interface Analise {
  totais: { orcamentoId: string; fornecedorNome: string; totalItens: number; desconto: number; frete: number; totalGeral: number; completo: boolean }[];
  porItem: LinhaComparativo[];
  melhorUnico: { orcamentoId: string; fornecedorNome: string; total: number } | null;
  melhorCombinacao: (Combinacao & { heuristica: boolean }) | null;
  /** quanto a melhor combinação economiza em relação ao melhor orçamento único */
  economia: number | null;
  /** comprar o mais barato de cada item usando todos os orçamentos */
  todosMaisBaratos: Combinacao | null;
  incompletos: { orcamentoId: string; fornecedorNome: string; faltando: ItemPedidoCalc[] }[];
}

export function analisar(itens: ItemPedidoCalc[], orcs: OrcamentoCalc[]): Analise {
  const unico = melhorOrcamentoUnico(itens, orcs);
  const comb = melhorCombinacao(itens, orcs);
  return {
    totais: orcs.map((o) => ({
      orcamentoId: o.id,
      fornecedorNome: o.fornecedorNome,
      totalItens: totalItens(o),
      desconto: o.desconto,
      frete: o.frete,
      totalGeral: totalGeral(o),
      completo: cobreTudo(o, itens),
    })),
    porItem: comparativoPorItem(itens, orcs),
    melhorUnico: unico ? { orcamentoId: unico.orcamento.id, fornecedorNome: unico.orcamento.fornecedorNome, total: unico.total } : null,
    melhorCombinacao: comb,
    economia: unico && comb ? arred(unico.total - comb.custo) : null,
    todosMaisBaratos: avaliarCombinacao(
      itens,
      orcs.filter((o) => o.itens.length > 0),
    ),
    incompletos: orcs
      .map((o) => ({ orcamentoId: o.id, fornecedorNome: o.fornecedorNome, faltando: itensFaltando(o, itens) }))
      .filter((x) => x.faltando.length > 0),
  };
}

// ---------------------------------------------------------------------------
// Validade
// ---------------------------------------------------------------------------

export type StatusValidade = "VENCIDO" | "VENCENDO" | "OK" | "SEM_VALIDADE";

/** Compara só as datas (dia), ignorando hora. "Vencendo" = vence em até 2 dias. */
export function statusValidade(validade: Date | null | undefined, hoje: Date = new Date()): StatusValidade {
  if (!validade) return "SEM_VALIDADE";
  const d = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const hojeLocal = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.round((d(validade) - hojeLocal) / 86_400_000);
  if (dias < 0) return "VENCIDO";
  if (dias <= 2) return "VENCENDO";
  return "OK";
}
