/**
 * Importação de itens a partir de planilhas/CSV: cada linha (lista de células)
 * vira um item. Funções puras, testadas em importar.test.ts.
 */
import { parseLinha, unidadeDe, type ItemColado } from "./colar-lista";
import { parseNumeroBR } from "./formato";

const CABECALHO = /^(item|descri[cç][aã]o|material|produto|quantidade|qtd\.?|qtde|unidade|un\.?|und|#|n[ºo°]?)$/i;

/**
 * Interpreta uma linha de planilha. Procura uma célula numérica (quantidade),
 * uma célula que seja unidade e usa a maior célula de texto restante como descrição.
 * Se a linha tiver só uma célula de texto, cai no parser de "colar lista".
 */
export function parseLinhaPlanilha(celulas: (string | number | null | undefined)[]): ItemColado | null {
  const cels = celulas.map((c) => (c === null || c === undefined ? "" : String(c).trim())).filter((c) => c !== "");
  if (cels.length === 0) return null;
  if (cels.every((c) => CABECALHO.test(c))) return null; // linha de cabeçalho

  // classifica cada célula: número puro, unidade conhecida ou texto
  const tipos = cels.map((c) => {
    const n = /^[\d.,\s]+$/.test(c) ? parseNumeroBR(c) : null;
    if (n !== null) return { c, tipo: "num" as const, n };
    const u = unidadeDe(c);
    if (u) return { c, tipo: "un" as const, u };
    return { c, tipo: "txt" as const };
  });
  const textos = tipos.filter((t) => t.tipo === "txt");
  if (textos.length === 0) return null;

  // descrição = maior texto
  const desc = textos.reduce((a, b) => (b.c.length > a.c.length ? b : a));
  const iDesc = tipos.indexOf(desc);

  // quantidade = primeiro número depois da descrição (nº do item costuma vir antes);
  // se não houver, o último número antes dela
  const nums = tipos.map((t, i) => ({ t, i })).filter((x) => x.t.tipo === "num" && x.t.n! > 0);
  const qtd = nums.find((x) => x.i > iDesc) ?? nums.filter((x) => x.i < iDesc).at(-1);
  let quantidade: number | null = qtd ? qtd.t.n! : null;

  let unidade: string | null = tipos.find((t) => t.tipo === "un")?.u ?? null;
  // unidade desconhecida numa coluna própria ("barras", "jg"): palavra curta, sem espaço
  if (unidade === null) {
    const curta = textos.filter((t) => t !== desc && t.c.length <= 6 && !/\s/.test(t.c)).sort((a, b) => a.c.length - b.c.length)[0];
    if (curta) unidade = curta.c.toLowerCase();
  }
  if (quantidade === null && unidade === null) return parseLinha(desc.c);

  const descricao = desc.c;
  const base = parseLinha(descricao);
  return {
    quantidade: quantidade ?? base?.quantidade ?? 1,
    unidade: unidade ?? base?.unidade ?? "un",
    descricao: base?.descricao ?? descricao,
  };
}

/** CSV/TSV com separador ; , ou tab (detectado pela primeira linha). */
export function parseCsv(texto: string): ItemColado[] {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length === 0) return [];
  const sep = linhas[0].includes("\t") ? "\t" : linhas[0].includes(";") ? ";" : ",";
  // vírgula como separador conflita com decimal "1,5": só usa se não houver ; nem tab
  return linhas
    .map((l) => parseLinhaPlanilha(dividirCsv(l, sep)))
    .filter((i): i is ItemColado => i !== null);
}

function dividirCsv(linha: string, sep: string): string[] {
  const out: string[] = [];
  let atual = "";
  let aspas = false;
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas;
    else if (ch === sep && !aspas) {
      out.push(atual);
      atual = "";
    } else atual += ch;
  }
  out.push(atual);
  return out;
}
