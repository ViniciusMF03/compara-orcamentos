import { describe, expect, it } from "vitest";
import {
  analisar,
  arred,
  avaliarCombinacao,
  comparativoPorItem,
  conferenciaSugerida,
  itensFaltando,
  melhorCombinacao,
  melhorOrcamentoUnico,
  precoPorUnidadePedida,
  statusValidade,
  totalGeral,
  totalItem,
  totalItens,
  type Conferencia,
  type ItemPedidoCalc,
  type OrcamentoCalc,
} from "./calculos";
import { resumoWhatsApp } from "./resumo";

// ---- Exemplo do README: lista "Forro WC" -----------------------------------
const pedidos: [string, number, string][] = [
  ["Placa de gesso 1,20x1,80", 11, "un"],
  ["Tabica branca", 10, "pç"],
  ["Perfil F530", 12, "pç"],
  ["Regulador F530", 35, "un"],
  ["Arame nº 10", 5, "kg"],
  ["Bucha nº 6", 100, "un"],
  ["Parafuso 45 flangeado", 100, "un"],
  ["Fita azul", 1, "un"],
  ["Massa", 15, "kg"],
  ["Gesso", 20, "kg"],
];
const itens: ItemPedidoCalc[] = pedidos.map(([descricao, quantidade, unidade], i) => ({
  id: `i${i + 1}`,
  ordem: i + 1,
  descricao,
  quantidade,
  unidade,
}));

type Linha = [qtd: number, un: string, vu: number, conf?: Conferencia, eq?: number];
function orc(id: string, nome: string, frete: number, linhas: Linha[], desconto = 0): OrcamentoCalc {
  return {
    id,
    fornecedorNome: nome,
    frete,
    desconto,
    itens: linhas.map(([quantidade, unidade, valorUnitario, conferencia = "CONFERE", qtdEquivalente], i) => ({
      itemPedidoId: `i${i + 1}`,
      descricaoCotada: pedidos[i][0],
      quantidade,
      unidade,
      valorUnitario,
      conferencia,
      qtdEquivalente,
    })),
  };
}

const loja = orc("loja", "Loja do Gesso", 100, [
  [11, "un", 45],
  [10, "pç", 15.9],
  [12, "pç", 14.8],
  [35, "un", 1.7],
  [1, "rl", 85, "CONFERE", 5],
  [100, "un", 0.05],
  [100, "un", 0.24, "DIVERGENTE"],
  [1, "un", 27.5],
  [1, "bd", 69.9, "CONFIRMAR", 25],
  [1, "sc", 26, "CONFERE", 20],
]);
const design = orc("design", "Design Gesso", 85, [
  [11, "un", 45.32],
  [10, "pç", 16.6, "CONFIRMAR"],
  [12, "pç", 15],
  [35, "un", 1.25],
  [5, "kg", 16.9],
  [1, "pct", 4, "CONFERE", 100],
  [1, "pct", 11.92, "CONFERE", 100],
  [1, "un", 24.9],
  [1, "bd", 63.95, "CONFIRMAR", 25],
  [1, "sc", 47, "DIVERGENTE", 40],
]);
const orcs = [loja, design];

describe("totais (exemplo do README)", () => {
  it("totalItem arredonda a centavos", () => {
    expect(totalItem({ quantidade: 100, valorUnitario: 0.24 })).toBe(24);
    expect(totalItem({ quantidade: 11, valorUnitario: 45.32 })).toBe(498.52);
  });

  it("Loja do Gesso: itens R$ 1.128,50 + frete R$ 100,00 = R$ 1.228,50", () => {
    expect(totalItens(loja)).toBe(1128.5);
    expect(totalGeral(loja)).toBe(1228.5);
  });

  it("Design Gesso: itens R$ 1.124,54 + frete R$ 85,00 = R$ 1.209,54", () => {
    expect(totalItens(design)).toBe(1124.54);
    expect(totalGeral(design)).toBe(1209.54);
  });

  it("desconto é subtraído do total geral", () => {
    expect(totalGeral({ ...design, desconto: 9.54 })).toBe(1200);
  });
});

describe("melhor forma de comprar (exemplo do README)", () => {
  it("melhor orçamento único é Design Gesso, economia de R$ 18,96", () => {
    const u = melhorOrcamentoUnico(itens, orcs)!;
    expect(u.orcamento.id).toBe("design");
    expect(u.total).toBe(1209.54);
    expect(arred(totalGeral(loja) - u.total)).toBe(18.96);
  });

  it("mais barato de cada item nos dois: R$ 1.090,62 + R$ 185,00 = R$ 1.275,62", () => {
    const c = avaliarCombinacao(itens, orcs)!;
    expect(arred(c.compras.reduce((s, x) => s + x.subtotal, 0))).toBe(1090.62);
    expect(arred(c.compras.reduce((s, x) => s + x.frete, 0))).toBe(185);
    expect(c.custo).toBe(1275.62);
  });

  it("melhor combinação: só Design Gesso (R$ 1.209,54)", () => {
    const c = melhorCombinacao(itens, orcs)!;
    expect(c.orcamentoIds).toEqual(["design"]);
    expect(c.custo).toBe(1209.54);
    expect(c.heuristica).toBe(false);
  });

  it("analisar junta tudo e economia da combinação = 0 neste caso", () => {
    const a = analisar(itens, orcs);
    expect(a.melhorUnico?.fornecedorNome).toBe("Design Gesso");
    expect(a.melhorCombinacao?.custo).toBe(1209.54);
    expect(a.economia).toBe(0);
    expect(a.todosMaisBaratos?.custo).toBe(1275.62);
    expect(a.incompletos).toEqual([]);
  });

  it("dividir compensa quando o frete é baixo", () => {
    const semFrete = [
      { ...loja, frete: 0 },
      { ...design, frete: 0 },
    ];
    const c = melhorCombinacao(itens, semFrete)!;
    expect(c.orcamentoIds.sort()).toEqual(["design", "loja"]);
    expect(c.custo).toBe(1090.62);
  });

  it("só valem combinações que cobrem todos os itens", () => {
    const parcial = { ...loja, id: "parcial", frete: 0, itens: loja.itens.slice(0, 3) };
    expect(melhorOrcamentoUnico(itens, [parcial])).toBeNull();
    expect(melhorCombinacao(itens, [parcial])).toBeNull();
    expect(itensFaltando(parcial, itens).map((i) => i.id)).toEqual(["i4", "i5", "i6", "i7", "i8", "i9", "i10"]);
  });

  it("combina parcial + completo quando sai mais barato", () => {
    // fornecedor barato que só cotou a placa, sem frete
    const placa = { id: "p", fornecedorNome: "Placas SA", frete: 0, desconto: 0, itens: [{ ...design.itens[0], valorUnitario: 40 }] };
    const c = melhorCombinacao(itens, [loja, design, placa])!;
    expect(c.orcamentoIds.sort()).toEqual(["design", "p"]);
    expect(c.custo).toBe(arred(1209.54 - 498.52 + 440));
    const a = analisar(itens, [loja, design, placa]);
    expect(a.economia).toBe(58.52);
    expect(a.incompletos.map((x) => x.orcamentoId)).toEqual(["p"]);
  });

  it("acima de 12 orçamentos usa heurística e acha a solução", () => {
    const muitos: OrcamentoCalc[] = Array.from({ length: 14 }, (_, k) => ({
      ...loja,
      id: `o${k}`,
      fornecedorNome: `F${k}`,
      frete: 100 + k,
    }));
    muitos.push(design);
    const c = melhorCombinacao(itens, muitos)!;
    expect(c.heuristica).toBe(true);
    expect(c.orcamentoIds).toEqual(["design"]);
  });
});

describe("comparativo por item", () => {
  const linhas = comparativoPorItem(itens, orcs);

  it("marca o mais barato e a diferença", () => {
    const placa = linhas[0];
    expect(placa.menor).toBe(495);
    expect(placa.diferenca).toBe(3.52);
    expect(placa.celulas.find((c) => c.maisBarato)?.orcamentoId).toBe("loja");
  });

  it("divergente entra no cálculo com aviso", () => {
    const parafuso = linhas[6];
    const celLoja = parafuso.celulas.find((c) => c.orcamentoId === "loja")!;
    expect(celLoja.divergente).toBe(true);
    expect(celLoja.total).toBe(24);
    expect(parafuso.menor).toBe(11.92);
  });

  it("não cotado aparece como null", () => {
    const parcial = { ...loja, id: "parcial", itens: loja.itens.slice(0, 1) };
    const l = comparativoPorItem(itens, [parcial, design]);
    expect(l[1].celulas[0].total).toBeNull();
    expect(l[1].diferenca).toBeNull();
  });

  it("empate marca os dois como mais barato", () => {
    const igual = { ...loja, id: "igual" };
    const l = comparativoPorItem(itens, [loja, igual]);
    expect(l[0].celulas.every((c) => c.maisBarato)).toBe(true);
    expect(l[0].diferenca).toBe(0);
  });
});

describe("preço por unidade pedida", () => {
  it("saco de 40 kg vs 20 kg: R$/kg", () => {
    expect(precoPorUnidadePedida(itens[9], design.itens[9])).toBe(1.175);
    expect(precoPorUnidadePedida(itens[6], design.itens[6])).toBe(0.1192);
    expect(precoPorUnidadePedida(itens[9], loja.itens[9])).toBe(1.3);
  });

  it("mesma unidade usa a quantidade cotada", () => {
    expect(precoPorUnidadePedida(itens[4], design.itens[4])).toBe(16.9);
  });

  it("unidade diferente sem equivalência não dá para comparar", () => {
    expect(precoPorUnidadePedida(itens[9], { ...design.itens[9], qtdEquivalente: null })).toBeNull();
  });

  it("marca CONFIRMAR automaticamente se quantidade/unidade difere e não foi conferido", () => {
    const pedido = { quantidade: 20, unidade: "kg" };
    expect(conferenciaSugerida(pedido, { quantidade: 1, unidade: "sc" }, "CONFERE", false)).toBe("CONFIRMAR");
    expect(conferenciaSugerida(pedido, { quantidade: 20, unidade: "KG" }, "CONFERE", false)).toBe("CONFERE");
    expect(conferenciaSugerida(pedido, { quantidade: 1, unidade: "sc" }, "CONFERE", true)).toBe("CONFERE");
    expect(conferenciaSugerida(pedido, { quantidade: 1, unidade: "sc" }, "DIVERGENTE", false)).toBe("DIVERGENTE");
  });
});

describe("validade", () => {
  const hoje = new Date(2026, 10, 25, 15, 0); // 25/11/2026 local
  const d = (s: string) => new Date(`${s}T12:00:00Z`);
  it("classifica vencido, vencendo em até 2 dias e ok", () => {
    expect(statusValidade(null, hoje)).toBe("SEM_VALIDADE");
    expect(statusValidade(d("2026-11-24"), hoje)).toBe("VENCIDO");
    expect(statusValidade(d("2026-11-25"), hoje)).toBe("VENCENDO");
    expect(statusValidade(d("2026-11-27"), hoje)).toBe("VENCENDO");
    expect(statusValidade(d("2026-11-28"), hoje)).toBe("OK");
  });
});

describe("resumo para WhatsApp", () => {
  it("lista o que comprar em cada fornecedor com total", () => {
    const txt = resumoWhatsApp("Forro WC", analisar(itens, orcs));
    expect(txt).toContain("*Design Gesso*");
    expect(txt).toContain("Frete: R$ 85,00");
    expect(txt).toContain("*Total geral: R$ 1.209,54*");
    expect(txt).not.toContain("Loja do Gesso");
  });
});
