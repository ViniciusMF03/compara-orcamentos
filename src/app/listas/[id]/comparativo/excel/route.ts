import ExcelJS from "exceljs";
import { carregarLista } from "@/lib/dados";
import { analisar } from "@/lib/calculos";
import { formatarData } from "@/lib/formato";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOEDA = '"R$" #,##0.00';
const VERDE = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } } as const;
const CINZA = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F1EF" } } as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lista = await carregarLista(id);
  if (!lista) return new Response("Lista não encontrada", { status: 404 });

  const orcs = lista.orcamentos;
  const a = analisar(lista.itens, orcs);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Compara Orçamentos";

  // ---- Planilha 1: comparativo ------------------------------------------------
  const ws = wb.addWorksheet("Comparativo", { views: [{ state: "frozen", xSplit: 3, ySplit: 3 }] });
  ws.addRow([`${lista.nome}${lista.obraNome ? ` — ${lista.obraNome}` : ""}`]).font = { bold: true, size: 14 };
  ws.addRow([`Gerado em ${formatarData(new Date())}`]);
  const cab = ws.addRow(["Item", "Qtd", "Un", ...orcs.map((o) => o.fornecedorNome), "Diferença"]);
  cab.font = { bold: true };
  cab.eachCell((c) => (c.fill = CINZA));

  for (const l of a.porItem) {
    const row = ws.addRow([
      l.item.descricao,
      l.item.quantidade,
      l.item.unidade,
      ...l.celulas.map((c) => (c.total === null ? "não cotado" : c.total)),
      l.diferenca,
    ]);
    l.celulas.forEach((c, i) => {
      const cell = row.getCell(4 + i);
      cell.numFmt = MOEDA;
      if (c.maisBarato) cell.fill = VERDE;
      if (c.total === null) cell.font = { color: { argb: "FF999999" }, italic: true };
      const notas = [
        c.cotado && `${c.cotado.descricaoCotada}: ${c.cotado.quantidade} ${c.cotado.unidade} × R$ ${c.cotado.valorUnitario}`,
        c.cotado?.conferencia === "DIVERGENTE" && "⚠ DIVERGENTE",
        c.cotado?.conferencia === "CONFIRMAR" && "? CONFIRMAR",
        c.cotado?.observacao,
      ].filter(Boolean);
      if (notas.length) cell.note = notas.join("\n");
      if (c.cotado?.conferencia === "DIVERGENTE") cell.font = { color: { argb: "FFB91C1C" } };
    });
    row.getCell(4 + orcs.length).numFmt = MOEDA;
  }

  const totais = new Map(a.totais.map((t) => [t.orcamentoId, t]));
  for (const [rotulo, f, negrito] of [
    ["Subtotal", (t: (typeof a.totais)[number]) => t.totalItens, false],
    ["Desconto", (t: (typeof a.totais)[number]) => -t.desconto, false],
    ["Frete", (t: (typeof a.totais)[number]) => t.frete, false],
    ["Total geral", (t: (typeof a.totais)[number]) => t.totalGeral, true],
  ] as const) {
    const row = ws.addRow([rotulo, null, null, ...orcs.map((o) => f(totais.get(o.id)!))]);
    row.font = { bold: negrito };
    orcs.forEach((o, i) => {
      const cell = row.getCell(4 + i);
      cell.numFmt = MOEDA;
      if (negrito && a.melhorUnico?.orcamentoId === o.id) cell.fill = VERDE;
    });
  }
  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 6;
  for (let i = 0; i <= orcs.length; i++) ws.getColumn(4 + i).width = 18;

  // ---- Planilha 2: melhor compra ---------------------------------------------
  const ws2 = wb.addWorksheet("Melhor compra");
  ws2.addRow(["Melhor forma de comprar"]).font = { bold: true, size: 14 };
  if (a.melhorUnico) ws2.addRow(["Melhor orçamento único", a.melhorUnico.fornecedorNome, a.melhorUnico.total]).getCell(3).numFmt = MOEDA;
  const comb = a.melhorCombinacao;
  if (!comb) {
    ws2.addRow(["Nenhuma combinação cobre todos os itens."]);
  } else {
    ws2.addRow(["Melhor combinação", comb.compras.map((c) => c.fornecedorNome).join(" + "), comb.custo]).getCell(3).numFmt = MOEDA;
    if (a.economia !== null) ws2.addRow(["Economia", null, a.economia]).getCell(3).numFmt = MOEDA;
    if (comb.heuristica) ws2.addRow(["Atenção: mais de 12 orçamentos, combinação estimada por heurística."]);
    for (const c of comb.compras) {
      ws2.addRow([]);
      ws2.addRow([c.fornecedorNome]).font = { bold: true };
      ws2.addRow(["Item", "Qtd", "Un", "Total"]).font = { bold: true };
      for (const i of c.itens) ws2.addRow([i.item.descricao, i.item.quantidade, i.item.unidade, i.total]).getCell(4).numFmt = MOEDA;
      if (c.desconto) ws2.addRow(["Desconto", null, null, -c.desconto]).getCell(4).numFmt = MOEDA;
      ws2.addRow(["Frete", null, null, c.frete]).getCell(4).numFmt = MOEDA;
      const t = ws2.addRow(["Total", null, null, c.total]);
      t.font = { bold: true };
      t.getCell(4).numFmt = MOEDA;
    }
  }
  ws2.getColumn(1).width = 36;
  ws2.getColumn(2).width = 24;
  ws2.getColumn(3).width = 16;
  ws2.getColumn(4).width = 16;

  const buffer = await wb.xlsx.writeBuffer();
  const nome = `comparativo-${lista.nome}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").toLowerCase();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nome}.xlsx"`,
    },
  });
}
